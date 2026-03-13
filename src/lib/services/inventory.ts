// ============================================================
// EDARA — Inventory Module Services
// Supabase CRUD for: warehouses, stock, stock_batches, stock_movements
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    Warehouse, WarehouseWithRefs, WarehouseInput,
    StockWithRefs, StockFilters,
    StockBatchWithRefs,
    StockMovementWithRefs,
    StockTransactionWithRefs,
    MovementType,
    ProfileLookup,
} from '@/lib/types/inventory'

// ── Stock Movement Input ─────────────────────────────────────

export interface StockMovementInput {
    product_id: string
    warehouse_id: string
    movement_type: MovementType
    quantity: number
    notes?: string | null
}

// ── Warehouses ───────────────────────────────────────────────

export async function getWarehouses(): Promise<WarehouseWithRefs[]> {
    const { data, error } = await supabase
        .from('warehouses')
        .select(`
            *,
            manager:profiles!manager_id ( full_name ),
            assigned_rep:profiles!assigned_rep_id ( full_name )
        `)
        .order('type')
        .order('name')

    if (error) throw error
    return (data || []) as WarehouseWithRefs[]
}

export async function getWarehouse(id: string): Promise<WarehouseWithRefs | null> {
    const { data, error } = await supabase
        .from('warehouses')
        .select(`
            *,
            manager:profiles!manager_id ( full_name ),
            assigned_rep:profiles!assigned_rep_id ( full_name )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as WarehouseWithRefs
}

export async function createWarehouse(input: Partial<WarehouseInput>): Promise<Warehouse> {
    const { data, error } = await supabase
        .from('warehouses')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as Warehouse
}

export async function updateWarehouse(id: string, input: Partial<WarehouseInput>): Promise<Warehouse> {
    const { data, error } = await supabase
        .from('warehouses')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Warehouse
}

export async function deleteWarehouse(id: string): Promise<void> {
    const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Stock (Read-only view — balances) ────────────────────────

export async function getStock(filters: StockFilters = {}): Promise<{ data: StockWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, warehouse_id, search, low_stock_only } = filters

    // Count query
    let countQuery = supabase
        .from('stock')
        .select('id', { count: 'exact', head: true })

    if (warehouse_id) countQuery = countQuery.eq('warehouse_id', warehouse_id)

    const { count } = await countQuery
    const total = count || 0

    // Data query with joins
    let query = supabase
        .from('stock')
        .select(`
            *,
            product:products!product_id ( name, sku, min_stock, unit_id, unit:units!unit_id ( name, symbol ) ),
            warehouse:warehouses!warehouse_id ( name, type )
        `)
        .gt('quantity', 0) // Only show items with positive stock

    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id)

    query = query
        .order('updated_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error } = await query

    if (error) throw error

    let result = (data || []) as StockWithRefs[]

    // Client-side search filter (product name)
    if (search) {
        const s = search.toLowerCase()
        result = result.filter(item =>
            item.product?.name?.toLowerCase().includes(s) ||
            item.product?.sku?.toLowerCase().includes(s)
        )
    }

    // Client-side low stock filter
    if (low_stock_only) {
        result = result.filter(item =>
            item.product && item.quantity <= item.product.min_stock
        )
    }

    return { data: result, total }
}

// ── Stock Batches ────────────────────────────────────────────

export async function getStockBatches(productId?: string, warehouseId?: string): Promise<StockBatchWithRefs[]> {
    let query = supabase
        .from('stock_batches')
        .select(`
            *,
            product:products!product_id ( name ),
            warehouse:warehouses!warehouse_id ( name )
        `)
        .gt('quantity', 0)

    if (productId) query = query.eq('product_id', productId)
    if (warehouseId) query = query.eq('warehouse_id', warehouseId)

    query = query.order('expiry_date', { ascending: true, nullsFirst: false })

    const { data, error } = await query
    if (error) throw error
    return (data || []) as StockBatchWithRefs[]
}

// ── Stock Movements (Read-only history) ──────────────────────

export async function getStockMovements(filters: {
    warehouse_id?: string
    product_id?: string
    movement_type?: string
    date_from?: string
    date_to?: string
    page?: number
    pageSize?: number
} = {}): Promise<{ data: StockMovementWithRefs[]; total: number }> {
    const { warehouse_id, product_id, movement_type, date_from, date_to, page = 1, pageSize = 25 } = filters

    let countQuery = supabase
        .from('stock_movements')
        .select('id', { count: 'exact', head: true })

    if (warehouse_id) countQuery = countQuery.eq('warehouse_id', warehouse_id)
    if (product_id) countQuery = countQuery.eq('product_id', product_id)
    if (movement_type) countQuery = countQuery.eq('movement_type', movement_type)
    if (date_from) countQuery = countQuery.gte('created_at', date_from)
    if (date_to) countQuery = countQuery.lte('created_at', date_to + 'T23:59:59')

    const { count } = await countQuery
    const total = count || 0

    let query = supabase
        .from('stock_movements')
        .select(`
            *,
            product:products!product_id ( name ),
            warehouse:warehouses!warehouse_id ( name ),
            creator:profiles!created_by ( full_name )
        `)

    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id)
    if (product_id) query = query.eq('product_id', product_id)
    if (movement_type) query = query.eq('movement_type', movement_type)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error } = await query
    if (error) throw error

    return { data: (data || []) as StockMovementWithRefs[], total }
}

// ── Profile Lookups (for manager/rep dropdowns) ──────────────

export async function getProfileLookups(): Promise<ProfileLookup[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')

    if (error) throw error
    return (data || []) as ProfileLookup[]
}

// ── Product Lookups (for movement forms) ─────────────────────

export interface ProductLookup {
    id: string
    name: string
    sku: string | null
    unit_id: string | null
}

export async function getProductLookups(): Promise<ProductLookup[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, unit_id')
        .eq('is_active', true)
        .order('name')

    if (error) throw error
    return (data || []) as ProductLookup[]
}

// ── Create Stock Movements — Batch + Atomic (C1) ─────────────

export interface MovementLineItem {
    product_id: string
    quantity: number
    notes?: string | null
}

export interface BatchMovementInput {
    warehouse_id: string
    movement_type: MovementType
    items: MovementLineItem[]
    direction?: 'in' | 'out'  // for adjustments: increase or decrease
}

export async function createStockMovementsBatch(input: BatchMovementInput): Promise<void> {
    const { warehouse_id, movement_type, items, direction } = input
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
        user_id: user?.id || '',
        transaction_type: movement_type,
        direction: direction || 'in',
        items: items.map(it => ({
            product_id: it.product_id,
            warehouse_id,
            movement_type,
            quantity: Math.abs(it.quantity),
            notes: it.notes || null,
        })),
    }

    const { error } = await supabase.rpc('process_stock_movements_batch', {
        p_payload: payload,
    })
    if (error) throw error
}

// ── Create Transfer — Batch + Atomic (C2) ────────────────────

export interface TransferLineItem {
    product_id: string
    quantity: number
}

export interface BatchTransferInput {
    from_warehouse_id: string
    to_warehouse_id: string
    items: TransferLineItem[]
    notes?: string | null
}

export async function createTransferBatch(input: BatchTransferInput): Promise<void> {
    const { from_warehouse_id, to_warehouse_id, items, notes } = input
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
        from_warehouse_id,
        to_warehouse_id,
        user_id: user?.id || '',
        notes: notes || '',
        items: items.map(it => ({
            product_id: it.product_id,
            quantity: Math.abs(it.quantity),
        })),
    }

    const { error } = await supabase.rpc('process_stock_transfer_batch', {
        p_payload: payload,
    })
    if (error) throw error
}

// ── Warehouse stock summary (for L3) ─────────────────────────

export async function getWarehouseStockSummary(): Promise<Record<string, { count: number; value: number }>> {
    const { data, error } = await supabase
        .from('stock')
        .select('warehouse_id, quantity, product:products!product_id ( cost_price )')
        .gt('quantity', 0)

    if (error) throw error
    const result: Record<string, { count: number; value: number }> = {}
    for (const row of (data || [])) {
        const wid = row.warehouse_id as string
        if (!result[wid]) result[wid] = { count: 0, value: 0 }
        result[wid].count += 1
        const cost = (row.product as unknown as { cost_price: number })?.cost_price || 0
        result[wid].value += (row.quantity as number) * cost
    }
    return result
}

// ── Stock Transactions ───────────────────────────────────────

export async function getStockTransactions(filters: {
    transaction_type?: string
    date_from?: string
    date_to?: string
    page?: number
    pageSize?: number
} = {}): Promise<{ data: StockTransactionWithRefs[]; total: number }> {
    const { transaction_type, date_from, date_to, page = 1, pageSize = 25 } = filters

    let countQuery = supabase
        .from('stock_transactions')
        .select('id', { count: 'exact', head: true })

    if (transaction_type) countQuery = countQuery.eq('transaction_type', transaction_type)
    if (date_from) countQuery = countQuery.gte('created_at', date_from)
    if (date_to) countQuery = countQuery.lte('created_at', date_to + 'T23:59:59')

    const { count } = await countQuery
    const total = count || 0

    let query = supabase
        .from('stock_transactions')
        .select(`
            *,
            from_warehouse:warehouses!from_warehouse_id ( name ),
            to_warehouse:warehouses!to_warehouse_id ( name ),
            warehouse:warehouses!warehouse_id ( name ),
            creator:profiles!created_by ( full_name )
        `)

    if (transaction_type) query = query.eq('transaction_type', transaction_type)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error } = await query
    if (error) throw error

    return { data: (data || []) as StockTransactionWithRefs[], total }
}

export async function getTransactionMovements(transactionId: string): Promise<StockMovementWithRefs[]> {
    const { data, error } = await supabase
        .from('stock_movements')
        .select(`
            *,
            product:products!product_id ( name ),
            warehouse:warehouses!warehouse_id ( name ),
            creator:profiles!created_by ( full_name )
        `)
        .eq('reference_type', 'stock_transaction')
        .eq('reference_id', transactionId)
        .order('created_at')

    if (error) throw error
    return (data || []) as StockMovementWithRefs[]
}
