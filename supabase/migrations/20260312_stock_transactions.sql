-- ============================================================
-- Stock Transactions Tracking System
-- Groups individual movements into trackable operations
-- with unique reference numbers (TRN-00001, ADJ-00001, etc.)
-- ============================================================

-- ── 1. Create stock_transactions table ───────────────────────
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number TEXT UNIQUE NOT NULL,
    transaction_type TEXT NOT NULL,  -- 'transfer' | 'adjustment' | 'initial' | 'scrap' | 'purchase_in' | 'sales_out' | 'return_in' | 'return_out'
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    warehouse_id UUID REFERENCES warehouses(id),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    items_count INT NOT NULL DEFAULT 0,
    total_quantity NUMERIC NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK if table already existed without it
DO $$ BEGIN
    ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for fast listing
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions (transaction_type);

-- RLS
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_transactions_select" ON stock_transactions;
CREATE POLICY "stock_transactions_select" ON stock_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "stock_transactions_insert" ON stock_transactions;
CREATE POLICY "stock_transactions_insert" ON stock_transactions FOR INSERT WITH CHECK (true);


-- ── 2. Transaction number generator ─────────────────────────
CREATE OR REPLACE FUNCTION generate_transaction_number(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_next INT;
BEGIN
    CASE p_type
        WHEN 'transfer' THEN v_prefix := 'TRN';
        WHEN 'adjustment' THEN v_prefix := 'ADJ';
        WHEN 'initial' THEN v_prefix := 'INI';
        WHEN 'scrap' THEN v_prefix := 'SCR';
        WHEN 'purchase_in' THEN v_prefix := 'PUR';
        WHEN 'sales_out' THEN v_prefix := 'SAL';
        WHEN 'return_in' THEN v_prefix := 'RTI';
        WHEN 'return_out' THEN v_prefix := 'RTO';
        ELSE v_prefix := 'STK';
    END CASE;

    -- Prevent race condition: lock per-prefix during numbering
    PERFORM pg_advisory_xact_lock(hashtext(v_prefix));

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(transaction_number FROM LENGTH(v_prefix) + 2) AS INT)
    ), 0) + 1
    INTO v_next
    FROM stock_transactions
    WHERE transaction_number LIKE v_prefix || '-%';

    RETURN v_prefix || '-' || LPAD(v_next::TEXT, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generate_transaction_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_transaction_number(TEXT) TO anon;
