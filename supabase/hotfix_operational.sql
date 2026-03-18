
-- ============================================================
-- HOTFIX — إصلاحات الوظائف التشغيلية
-- تاريخ: 2026-03-17
-- ============================================================

-- FIX 1: confirm_sales_order — حماية البيع النقدي + رسائل خطأ أوضح
CREATE OR REPLACE FUNCTION confirm_sales_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_stock_row RECORD;
BEGIN
  SELECT * INTO v_order FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'أمر البيع غير موجود';  END IF;
  IF v_order.status != 'draft' THEN RAISE EXCEPTION 'أمر البيع ليس في حالة مسودة — الحالة الحالية: %', v_order.status; END IF;

  IF v_order.payment_method != 'cash' THEN
    IF NOT check_credit_limit(v_order.customer_id, v_order.total_amount) THEN
      RAISE EXCEPTION 'تجاوز الحد الائتماني للعميل — المبلغ: % جنيه', v_order.total_amount;
    END IF;
  ELSE
    IF v_order.vault_id IS NULL AND v_order.custody_id IS NULL THEN
      RAISE EXCEPTION 'البيع النقدي يتطلب تحديد خزنة أو حساب عهدة لاستلام المبلغ';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM sales_order_items WHERE order_id = p_order_id LOOP
    SELECT * INTO v_stock_row FROM stock
    WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id FOR UPDATE;

    IF v_stock_row IS NULL OR v_stock_row.quantity < v_item.base_quantity THEN
      RAISE EXCEPTION 'رصيد غير كافي للمنتج (المطلوب: % — المتاح: %)',
        v_item.base_quantity, COALESCE(v_stock_row.quantity, 0);
    END IF;

    UPDATE stock SET quantity = quantity - v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_order.warehouse_id, 'sales_out', -v_item.base_quantity, 'sales_order', p_order_id, p_user_id);
  END LOOP;

  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance + v_order.total_amount, updated_at = now()
    WHERE id = v_order.customer_id;
  ELSE
    IF v_order.vault_id IS NOT NULL THEN
      UPDATE vaults SET current_balance = current_balance + v_order.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'collection', v_order.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_order', p_order_id, 'تحصيل نقدي من أمر بيع', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      UPDATE custody_accounts SET current_balance = current_balance + v_order.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'collection', v_order.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_order', p_order_id, 'تحصيل نقدي من أمر بيع', p_user_id);
    END IF;
  END IF;

  UPDATE sales_orders SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  PERFORM auto_journal_entry('sales_order', p_order_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- FIX 2: approve_purchase_receipt — إصلاح حساب إجمالي الاستلام
CREATE OR REPLACE FUNCTION approve_purchase_receipt(p_receipt_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt RECORD;
  v_po RECORD;
  v_item RECORD;
  v_all_received BOOLEAN;
BEGIN
  SELECT * INTO v_receipt FROM purchase_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF v_receipt IS NULL THEN RAISE EXCEPTION 'إذن الاستلام غير موجود'; END IF;
  IF v_receipt.status != 'pending_approval' THEN RAISE EXCEPTION 'إذن الاستلام ليس في حالة انتظار'; END IF;

  FOR v_item IN SELECT * FROM purchase_receipt_items WHERE receipt_id = p_receipt_id LOOP
    IF v_item.accepted_quantity > 0 THEN
      INSERT INTO stock (product_id, warehouse_id, quantity)
      VALUES (v_item.product_id, v_receipt.warehouse_id, v_item.base_quantity)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
        quantity = stock.quantity + v_item.base_quantity, updated_at = now();

      INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
      VALUES (v_item.product_id, v_receipt.warehouse_id, 'purchase_in', v_item.base_quantity, 'purchase_receipt', p_receipt_id, p_user_id);

      UPDATE purchase_order_items SET received_quantity = received_quantity + v_item.base_quantity
      WHERE id = v_item.order_item_id;
    END IF;
  END LOOP;

  UPDATE purchase_receipts SET status = 'approved', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_receipt_id;

  SELECT * INTO v_po FROM purchase_orders WHERE id = v_receipt.purchase_order_id FOR UPDATE;

  SELECT NOT EXISTS(
    SELECT 1 FROM purchase_order_items WHERE order_id = v_po.id AND received_quantity < base_quantity
  ) INTO v_all_received;

  IF v_all_received THEN
    UPDATE purchase_orders SET status = 'received', updated_at = now() WHERE id = v_po.id;
  ELSE
    UPDATE purchase_orders SET status = 'partially_received', updated_at = now() WHERE id = v_po.id;
  END IF;

  IF v_po.payment_method != 'cash' THEN
    DECLARE v_receipt_total NUMERIC;
    BEGIN
      SELECT COALESCE(SUM(
        CASE WHEN poi.base_quantity > 0
          THEN (pri.accepted_quantity::NUMERIC / poi.base_quantity::NUMERIC) * poi.total
          ELSE 0
        END
      ), 0) INTO v_receipt_total
      FROM purchase_receipt_items pri
      JOIN purchase_order_items poi ON poi.id = pri.order_item_id
      WHERE pri.receipt_id = p_receipt_id AND pri.accepted_quantity > 0;

      UPDATE suppliers SET current_balance = current_balance + v_receipt_total, updated_at = now()
      WHERE id = v_po.supplier_id;
    END;
  END IF;

  PERFORM auto_journal_entry('purchase_receipt', p_receipt_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'receipt_id', p_receipt_id);
END;
$$;

-- FIX 3: confirm_sales_return — حماية المرتجع النقدي
CREATE OR REPLACE FUNCTION confirm_sales_return(p_return_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_order RECORD;
BEGIN
  SELECT * INTO v_return FROM sales_returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN RAISE EXCEPTION 'المرتجع غير موجود'; END IF;
  IF v_return.status != 'draft' THEN RAISE EXCEPTION 'المرتجع ليس في حالة مسودة'; END IF;

  SELECT * INTO v_order FROM sales_orders WHERE id = v_return.order_id;

  FOR v_item IN SELECT * FROM sales_return_items WHERE return_id = p_return_id LOOP
    UPDATE stock SET quantity = quantity + v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id;

    IF NOT FOUND THEN
      INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (v_item.product_id, v_return.warehouse_id, v_item.base_quantity);
    END IF;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_return.warehouse_id, 'return_in', v_item.base_quantity, 'sales_return', p_return_id, p_user_id);
  END LOOP;

  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.customer_id;
  ELSE
    IF v_order.vault_id IS NOT NULL THEN
      IF (SELECT current_balance FROM vaults WHERE id = v_order.vault_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لاسترداد المرتجع';
      END IF;
      UPDATE vaults SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'withdrawal', -v_return.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      IF (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد العهدة غير كافٍ لاسترداد المرتجع';
      END IF;
      UPDATE custody_accounts SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'return', -v_return.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSE
      RAISE EXCEPTION 'لا يمكن استرداد مبلغ المرتجع النقدي — أمر البيع الأصلي لا يحتوي على خزنة أو عهدة';
    END IF;
  END IF;

  UPDATE sales_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  PERFORM auto_journal_entry('sales_return', p_return_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- HOTFIX 4 — إلغاء أوامر الشراء
-- تاريخ: 2026-03-18
-- ============================================================

-- إضافة أعمدة الإلغاء لجدول أوامر الشراء
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- دالة إلغاء أمر الشراء
CREATE OR REPLACE FUNCTION cancel_purchase_order(p_po_id UUID, p_reason TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'أمر الشراء غير موجود'; END IF;

  IF v_order.status NOT IN ('draft', 'approved') THEN
    RAISE EXCEPTION 'لا يمكن إلغاء أمر شراء في حالة: %', v_order.status;
  END IF;

  -- إذا كان الأمر معتمد وتم تحديث رصيد المورد سابقاً، يجب عكس ذلك
  -- (ملاحظة: في التدفق الحالي، رصيد المورد يتحدث عند اعتماد إذن الاستلام وليس عند اعتماد الأمر)

  UPDATE purchase_orders
  SET status = 'cancelled',
      cancel_reason = p_reason,
      cancelled_by = p_user_id,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_po_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_po_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- HOTFIX 5 — إصلاح confirm_sales_return
-- الخطأ: record "v_order" is not assigned yet (55000)
-- السبب: لا يتحقق من وجود أمر البيع الأصلي بعد SELECT
-- تاريخ: 2026-03-18
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_sales_return(p_return_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_order RECORD;
BEGIN
  -- 1. قفل المرتجع والتحقق من وجوده وحالته
  SELECT * INTO v_return FROM sales_returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN
    RAISE EXCEPTION 'المرتجع غير موجود';
  END IF;
  IF v_return.status != 'draft' THEN
    RAISE EXCEPTION 'المرتجع ليس في حالة مسودة — الحالة الحالية: %', v_return.status;
  END IF;

  -- 2. ★ الإصلاح الحرج ★ التحقق من وجود أمر البيع الأصلي
  SELECT * INTO v_order FROM sales_orders WHERE id = v_return.order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'أمر البيع الأصلي غير موجود — تأكد من صحة البيانات';
  END IF;
  IF v_order.status NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'أمر البيع الأصلي ليس مؤكداً — الحالة: %', v_order.status;
  END IF;

  -- 3. إعادة البضاعة إلى المخزون
  FOR v_item IN SELECT * FROM sales_return_items WHERE return_id = p_return_id LOOP
    UPDATE stock SET quantity = quantity + v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id;

    IF NOT FOUND THEN
      INSERT INTO stock (product_id, warehouse_id, quantity)
      VALUES (v_item.product_id, v_return.warehouse_id, v_item.base_quantity);
    END IF;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_return.warehouse_id, 'return_in', v_item.base_quantity, 'sales_return', p_return_id, p_user_id);
  END LOOP;

  -- 4. عكس الرصيد المالي حسب طريقة الدفع
  IF v_order.payment_method != 'cash' THEN
    -- آجل: خصم من رصيد العميل
    UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.customer_id;
  ELSE
    -- نقدي: استرداد من الخزنة أو العهدة
    IF v_order.vault_id IS NOT NULL THEN
      IF (SELECT current_balance FROM vaults WHERE id = v_order.vault_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لاسترداد المرتجع — المطلوب: % جنيه', v_return.total_amount;
      END IF;
      UPDATE vaults SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'withdrawal', -v_return.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      IF (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد العهدة غير كافٍ لاسترداد المرتجع — المطلوب: % جنيه', v_return.total_amount;
      END IF;
      UPDATE custody_accounts SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'return', -v_return.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSE
      -- نقدي لكن بدون خزنة أو عهدة — خصم من رصيد العميل كبديل آمن
      UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_return.customer_id;
    END IF;
  END IF;

  -- 5. تحديث حالة المرتجع
  UPDATE sales_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  -- 6. قيد محاسبي تلقائي
  PERFORM auto_journal_entry('sales_return', p_return_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

-- ============================================================
-- HOTFIX 6 — إصلاح confirm_purchase_return
-- إضافة تحقق من حالة أمر الشراء + حماية إضافية
-- تاريخ: 2026-03-18
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_purchase_return(p_return_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_po RECORD;
  v_stock_qty NUMERIC;
BEGIN
  -- 1. قفل المرتجع والتحقق من وجوده وحالته
  SELECT * INTO v_return FROM purchase_returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN
    RAISE EXCEPTION 'المرتجع غير موجود';
  END IF;
  IF v_return.status != 'draft' THEN
    RAISE EXCEPTION 'المرتجع ليس في حالة مسودة — الحالة الحالية: %', v_return.status;
  END IF;

  -- 2. التحقق من أمر الشراء الأصلي (إن وجد)
  IF v_return.purchase_order_id IS NOT NULL THEN
    SELECT * INTO v_po FROM purchase_orders WHERE id = v_return.purchase_order_id;
    IF v_po IS NULL THEN
      RAISE EXCEPTION 'أمر الشراء الأصلي غير موجود';
    END IF;
    IF v_po.status = 'cancelled' THEN
      RAISE EXCEPTION 'لا يمكن عمل مرتجع لأمر شراء ملغى';
    END IF;
  END IF;

  -- 3. خصم البضاعة من المخزون (مع فحص الرصيد)
  FOR v_item IN SELECT * FROM purchase_return_items WHERE return_id = p_return_id LOOP
    SELECT quantity INTO v_stock_qty FROM stock
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id FOR UPDATE;

    IF COALESCE(v_stock_qty, 0) < v_item.base_quantity THEN
      RAISE EXCEPTION 'رصيد مخزون غير كافٍ لإرجاع المنتج — المتاح: % المطلوب: %',
        COALESCE(v_stock_qty, 0), v_item.base_quantity;
    END IF;

    UPDATE stock SET quantity = quantity - v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_return.warehouse_id, 'return_out', -v_item.base_quantity, 'purchase_return', p_return_id, p_user_id);
  END LOOP;

  -- 4. عكس الرصيد المالي للمورد
  IF v_po IS NOT NULL AND v_po.payment_method != 'cash' THEN
    -- آجل: خصم من رصيد المورد
    UPDATE suppliers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.supplier_id;
  ELSIF v_po IS NULL THEN
    -- بدون أمر شراء: خصم من المورد مباشرة
    UPDATE suppliers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.supplier_id;
  END IF;
  -- ملاحظة: في حالة النقدي، المبلغ أصلاً ما تم إضافته لرصيد المورد فلا حاجة لعكسه

  -- 5. تحديث حالة المرتجع
  UPDATE purchase_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  -- 6. قيد محاسبي تلقائي
  PERFORM auto_journal_entry('purchase_return', p_return_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

