-- ============================================================
-- Atomic Stock Movement & Transfer Functions (v3)
-- Creates stock_transactions records + links movements
-- Single JSONB parameter per function
-- ============================================================

-- ── Clean up ALL old overloads ───────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure::text AS sig
        FROM pg_proc
        WHERE proname = 'process_stock_movements_batch'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
    END LOOP;

    FOR r IN
        SELECT oid::regprocedure::text AS sig
        FROM pg_proc
        WHERE proname = 'process_stock_transfer_batch'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
    END LOOP;
END
$$;


-- ── Batch Stock Movements (atomic) ───────────────────────────
-- p_payload: { items: [{product_id, warehouse_id, movement_type, quantity, notes?}], user_id?, transaction_type? }
CREATE OR REPLACE FUNCTION process_stock_movements_batch(p_payload JSONB)
RETURNS JSONB  -- returns { transaction_id, transaction_number }
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item JSONB;
    v_product_id UUID;
    v_warehouse_id UUID;
    v_movement_type TEXT;
    v_quantity NUMERIC;
    v_notes TEXT;
    v_is_inbound BOOLEAN;
    v_existing_id UUID;
    v_existing_qty NUMERIC;
    v_user_uuid UUID;
    v_items JSONB;
    v_txn_id UUID;
    v_txn_number TEXT;
    v_txn_type TEXT;
    v_items_count INT;
    v_total_qty NUMERIC := 0;
    v_warehouse_for_txn UUID;
    v_direction TEXT;
BEGIN
    -- Extract user_id
    IF p_payload->>'user_id' IS NOT NULL AND p_payload->>'user_id' <> '' THEN
        v_user_uuid := (p_payload->>'user_id')::UUID;
    ELSE
        v_user_uuid := NULL;
    END IF;

    -- Extract items array
    v_items := p_payload->'items';
    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RAISE EXCEPTION 'يجب إضافة عنصر واحد على الأقل في items';
    END IF;

    v_items_count := jsonb_array_length(v_items);

    -- Determine transaction type (explicit > inferred from first item)
    v_txn_type := COALESCE(NULLIF(p_payload->>'transaction_type', ''), (v_items->0)->>'movement_type');
    v_warehouse_for_txn := ((v_items->0)->>'warehouse_id')::UUID;

    -- Extract direction for adjustments: 'in' (default) or 'out'
    v_direction := COALESCE(NULLIF(p_payload->>'direction', ''), 'in');

    -- Calculate total quantity
    FOR item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_total_qty := v_total_qty + ABS((item->>'quantity')::NUMERIC);
    END LOOP;

    -- Create transaction record
    v_txn_number := generate_transaction_number(v_txn_type);
    INSERT INTO stock_transactions (transaction_number, transaction_type, warehouse_id, notes, items_count, total_quantity, created_by)
    VALUES (v_txn_number, v_txn_type, v_warehouse_for_txn, p_payload->>'notes', v_items_count, v_total_qty, v_user_uuid)
    RETURNING id INTO v_txn_id;

    -- Process each item
    FOR item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id   := (item->>'product_id')::UUID;
        v_warehouse_id := (item->>'warehouse_id')::UUID;
        v_movement_type := item->>'movement_type';
        v_quantity     := ABS((item->>'quantity')::NUMERIC);
        v_notes        := item->>'notes';

        IF v_product_id IS NULL OR v_warehouse_id IS NULL OR v_movement_type IS NULL OR v_quantity <= 0 THEN
            RAISE EXCEPTION 'كل عنصر يتطلب product_id, warehouse_id, movement_type, quantity > 0';
        END IF;

        -- 1. Insert movement record linked to transaction
        INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by, reference_type, reference_id)
        VALUES (v_product_id, v_warehouse_id, v_movement_type::movement_type, v_quantity, v_notes, v_user_uuid, 'stock_transaction', v_txn_id);

        -- 2. Determine direction
        --    adjustment respects the direction field from payload
        IF v_movement_type = 'adjustment' THEN
            v_is_inbound := (v_direction = 'in');
        ELSE
            v_is_inbound := v_movement_type IN ('purchase_in', 'transfer_in', 'return_in', 'initial');
        END IF;

        -- 3. Update stock balance with row-level lock
        SELECT id, quantity INTO v_existing_id, v_existing_qty
        FROM stock
        WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id
        FOR UPDATE;

        IF v_existing_id IS NOT NULL THEN
            IF v_is_inbound THEN
                UPDATE stock SET quantity = v_existing_qty + v_quantity, updated_at = NOW()
                WHERE id = v_existing_id;
            ELSE
                IF v_existing_qty < v_quantity THEN
                    RAISE EXCEPTION 'الكمية المتاحة غير كافية (متاح: %, مطلوب: %)', v_existing_qty, v_quantity;
                END IF;
                UPDATE stock SET quantity = v_existing_qty - v_quantity, updated_at = NOW()
                WHERE id = v_existing_id;
            END IF;
        ELSE
            IF v_is_inbound THEN
                INSERT INTO stock (product_id, warehouse_id, quantity)
                VALUES (v_product_id, v_warehouse_id, v_quantity);
            ELSE
                RAISE EXCEPTION 'لا يوجد رصيد لهذا المنتج في المخزن المحدد';
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('transaction_id', v_txn_id, 'transaction_number', v_txn_number);
END;
$$;


-- ── Batch Stock Transfer (atomic) ────────────────────────────
-- p_payload: { items: [{product_id, quantity}], from_warehouse_id, to_warehouse_id, user_id?, notes? }
CREATE OR REPLACE FUNCTION process_stock_transfer_batch(p_payload JSONB)
RETURNS JSONB  -- returns { transaction_id, transaction_number }
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_from UUID;
    v_to UUID;
    v_notes TEXT;
    v_items JSONB;
    v_txn_id UUID;
    v_txn_number TEXT;
    v_user_uuid UUID;
    v_items_count INT;
    v_total_qty NUMERIC := 0;
BEGIN
    v_from  := (p_payload->>'from_warehouse_id')::UUID;
    v_to    := (p_payload->>'to_warehouse_id')::UUID;
    v_notes := COALESCE(NULLIF(p_payload->>'notes', ''), 'تحويل بين مخازن');
    v_items := p_payload->'items';

    IF p_payload->>'user_id' IS NOT NULL AND p_payload->>'user_id' <> '' THEN
        v_user_uuid := (p_payload->>'user_id')::UUID;
    ELSE
        v_user_uuid := NULL;
    END IF;

    IF v_from IS NULL OR v_to IS NULL THEN
        RAISE EXCEPTION 'from_warehouse_id و to_warehouse_id مطلوبان';
    END IF;

    IF v_from = v_to THEN
        RAISE EXCEPTION 'لا يمكن التحويل لنفس المخزن';
    END IF;

    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RAISE EXCEPTION 'يجب إضافة منتج واحد على الأقل';
    END IF;

    v_items_count := jsonb_array_length(v_items);

    -- Calculate total quantity
    FOR item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_total_qty := v_total_qty + ABS((item->>'quantity')::NUMERIC);
    END LOOP;

    -- Create transaction record
    v_txn_number := generate_transaction_number('transfer');
    INSERT INTO stock_transactions (transaction_number, transaction_type, from_warehouse_id, to_warehouse_id, notes, items_count, total_quantity, created_by)
    VALUES (v_txn_number, 'transfer', v_from, v_to, v_notes, v_items_count, v_total_qty, v_user_uuid)
    RETURNING id INTO v_txn_id;

    -- Process each item (out from source + in to destination)
    FOR item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (item->>'product_id')::UUID;
        v_quantity   := ABS((item->>'quantity')::NUMERIC);

        IF v_product_id IS NULL OR v_quantity <= 0 THEN
            RAISE EXCEPTION 'كل صنف يتطلب product_id وكمية > 0';
        END IF;

        -- transfer_out from source
        INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by, reference_type, reference_id)
        VALUES (v_product_id, v_from, 'transfer_out'::movement_type, v_quantity, v_notes, v_user_uuid, 'stock_transaction', v_txn_id);

        -- Update source stock (decrease)
        DECLARE
            v_src_id UUID;
            v_src_qty NUMERIC;
        BEGIN
            SELECT id, quantity INTO v_src_id, v_src_qty
            FROM stock WHERE product_id = v_product_id AND warehouse_id = v_from FOR UPDATE;

            IF v_src_id IS NULL THEN
                RAISE EXCEPTION 'لا يوجد رصيد لهذا المنتج في المخزن المصدر';
            END IF;
            IF v_src_qty < v_quantity THEN
                RAISE EXCEPTION 'الكمية المتاحة غير كافية (متاح: %, مطلوب: %)', v_src_qty, v_quantity;
            END IF;
            UPDATE stock SET quantity = v_src_qty - v_quantity, updated_at = NOW() WHERE id = v_src_id;
        END;

        -- transfer_in to destination
        INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by, reference_type, reference_id)
        VALUES (v_product_id, v_to, 'transfer_in'::movement_type, v_quantity, v_notes, v_user_uuid, 'stock_transaction', v_txn_id);

        -- Update destination stock (increase / upsert)
        DECLARE
            v_dst_id UUID;
            v_dst_qty NUMERIC;
        BEGIN
            SELECT id, quantity INTO v_dst_id, v_dst_qty
            FROM stock WHERE product_id = v_product_id AND warehouse_id = v_to FOR UPDATE;

            IF v_dst_id IS NOT NULL THEN
                UPDATE stock SET quantity = v_dst_qty + v_quantity, updated_at = NOW() WHERE id = v_dst_id;
            ELSE
                INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (v_product_id, v_to, v_quantity);
            END IF;
        END;
    END LOOP;

    RETURN jsonb_build_object('transaction_id', v_txn_id, 'transaction_number', v_txn_number);
END;
$$;

-- ── Permissions ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION process_stock_movements_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_stock_movements_batch(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION process_stock_transfer_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_stock_transfer_batch(JSONB) TO anon;

-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
