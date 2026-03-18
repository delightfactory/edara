-- ============================================================
-- إصلاح نهائي — confirm_sales_return + confirm_purchase_return
-- المشكلة: في PostgreSQL plpgsql متغير من نوع RECORD لو ما اتعيّن
--          لا يمكن فحصه بـ IS NULL — ده بيسبب crash مباشر
--          الحل: استخدام IF NOT FOUND فقط بدون IS NULL
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 1. تأكيد مرتجع المبيعات
-- ═══════════════════════════════════════════════════════════

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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المرتجع غير موجود';
  END IF;
  IF v_return.status != 'draft' THEN
    RAISE EXCEPTION 'المرتجع ليس في حالة مسودة — الحالة الحالية: %', v_return.status;
  END IF;

  -- الإصلاح الحرج: IF NOT FOUND فقط (بدون IS NULL)
  SELECT * INTO v_order FROM sales_orders WHERE id = v_return.order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'أمر البيع الأصلي غير موجود — تأكد من صحة البيانات (order_id: %)', v_return.order_id;
  END IF;
  IF v_order.status NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'أمر البيع الأصلي ليس مؤكداً — الحالة: %', v_order.status;
  END IF;

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

  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.customer_id;
  ELSE
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
      UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_return.customer_id;
    END IF;
  END IF;

  UPDATE sales_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  PERFORM auto_journal_entry('sales_return', p_return_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. تأكيد مرتجع المشتريات
-- ═══════════════════════════════════════════════════════════

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
  v_has_po BOOLEAN := false;
BEGIN
  SELECT * INTO v_return FROM purchase_returns WHERE id = p_return_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المرتجع غير موجود';
  END IF;
  IF v_return.status != 'draft' THEN
    RAISE EXCEPTION 'المرتجع ليس في حالة مسودة — الحالة الحالية: %', v_return.status;
  END IF;

  IF v_return.purchase_order_id IS NOT NULL THEN
    SELECT * INTO v_po FROM purchase_orders WHERE id = v_return.purchase_order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'أمر الشراء الأصلي غير موجود';
    END IF;
    v_has_po := true;
    IF v_po.status = 'cancelled' THEN
      RAISE EXCEPTION 'لا يمكن عمل مرتجع لأمر شراء ملغى';
    END IF;
  END IF;

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

  -- عكس رصيد المورد: آجل = خصم، نقدي = لا حاجة (لم يُضف أصلاً)
  IF v_has_po AND v_po.payment_method != 'cash' THEN
    UPDATE suppliers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.supplier_id;
  ELSIF NOT v_has_po THEN
    UPDATE suppliers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.supplier_id;
  END IF;

  UPDATE purchase_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  PERFORM auto_journal_entry('purchase_return', p_return_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- تحقق
SELECT substring(prosrc from 1 for 200) AS first_200_chars
FROM pg_catalog.pg_proc
WHERE proname = 'confirm_sales_return'
AND pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public');
