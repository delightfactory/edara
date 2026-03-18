// ============================================================
// EDARA — Inventory Module Types
// Mirrors: warehouses, stock, stock_batches, stock_movements
// ============================================================

// ── ENUMs ────────────────────────────────────────────────────

export type WarehouseType = 'main' | 'branch' | 'van' | 'scrap'

export type MovementType =
    | 'purchase_in'    // استلام مشتريات
    | 'sales_out'      // صرف مبيعات
    | 'transfer_in'    // تحويل وارد
    | 'transfer_out'   // تحويل صادر
    | 'adjustment'     // تسوية
    | 'return_in'      // مرتجع عملاء
    | 'return_out'     // مرتجع مشتريات
    | 'scrap'          // إتلاف
    | 'initial'        // رصيد افتتاحي

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
    main: 'مستودع رئيسي',
    branch: 'فرع',
    van: 'سيارة توزيع',
    scrap: 'مخزن تالف',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
    purchase_in: 'استلام مشتريات',
    sales_out: 'صرف مبيعات',
    transfer_in: 'تحويل وارد',
    transfer_out: 'تحويل صادر',
    adjustment: 'تسوية مخزنية',
    return_in: 'مرتجع عملاء',
    return_out: 'مرتجع مشتريات',
    scrap: 'إتلاف',
    initial: 'رصيد افتتاحي',
}

// ── Warehouse ────────────────────────────────────────────────

export interface Warehouse {
    id: string
    name: string
    location: string | null
    type: WarehouseType
    manager_id: string | null
    assigned_rep_id: string | null
    branch_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface WarehouseWithRefs extends Warehouse {
    manager?: { full_name: string } | null
    assigned_rep?: { full_name: string } | null
}

export interface WarehouseInput {
    name: string
    location: string | null
    type: WarehouseType
    manager_id: string | null
    assigned_rep_id: string | null
    branch_id: string | null
    is_active: boolean
}

// ── Stock ────────────────────────────────────────────────────

export interface Stock {
    id: string
    product_id: string
    warehouse_id: string
    quantity: number
    reserved_qty: number
    updated_at: string
}

export interface StockWithRefs extends Stock {
    product: { name: string; sku: string | null; min_stock: number; unit_id: string | null } | null
    warehouse: { name: string; type: WarehouseType } | null
    product_unit?: { name: string; symbol: string } | null
}

export interface StockFilters {
    page?: number
    pageSize?: number
    warehouse_id?: string
    product_id?: string
    search?: string
    low_stock_only?: boolean
}

// ── Stock Batches ────────────────────────────────────────────

export interface StockBatch {
    id: string
    product_id: string
    warehouse_id: string
    batch_number: string
    expiry_date: string | null
    quantity: number
    created_at: string
    updated_at: string
}

export interface StockBatchWithRefs extends StockBatch {
    product: { name: string } | null
    warehouse: { name: string } | null
}

// ── Stock Movements ──────────────────────────────────────────

export interface StockMovement {
    id: string
    product_id: string
    warehouse_id: string
    movement_type: MovementType
    quantity: number
    batch_id: string | null
    reference_type: string | null
    reference_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
}

export interface StockMovementWithRefs extends StockMovement {
    product: { name: string } | null
    warehouse: { name: string } | null
    creator: { full_name: string } | null
}

// ── Profile Lookup (for dropdowns) ───────────────────────────

export interface ProfileLookup {
    id: string
    full_name: string
}

// ── Stock Transactions (grouped operations) ──────────────────

export type TransactionType = 'transfer' | 'adjustment' | 'initial' | 'scrap' | 'purchase_in' | 'sales_out' | 'return_in' | 'return_out'

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    transfer: 'تحويل مخزني',
    adjustment: 'تسوية مخزنية',
    initial: 'رصيد افتتاحي',
    scrap: 'إتلاف',
    purchase_in: 'استلام مشتريات',
    sales_out: 'صرف مبيعات',
    return_in: 'مرتجع عملاء',
    return_out: 'مرتجع مشتريات',
}

export interface StockTransaction {
    id: string
    transaction_number: string
    transaction_type: TransactionType
    from_warehouse_id: string | null
    to_warehouse_id: string | null
    warehouse_id: string | null
    notes: string | null
    status: string
    items_count: number
    total_quantity: number
    created_by: string | null
    created_at: string
}

export interface StockTransactionWithRefs extends StockTransaction {
    from_warehouse?: { name: string } | null
    to_warehouse?: { name: string } | null
    warehouse?: { name: string } | null
    creator?: { full_name: string } | null
}
