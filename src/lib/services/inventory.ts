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
    ProfileLookup,
} from '@/lib/types/inventory'

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
            product:products!product_id ( name, sku, min_stock, unit_id ),
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
    page?: number
    pageSize?: number
} = {}): Promise<{ data: StockMovementWithRefs[]; total: number }> {
    const { warehouse_id, product_id, movement_type, page = 1, pageSize = 25 } = filters

    let countQuery = supabase
        .from('stock_movements')
        .select('id', { count: 'exact', head: true })

    if (warehouse_id) countQuery = countQuery.eq('warehouse_id', warehouse_id)
    if (product_id) countQuery = countQuery.eq('product_id', product_id)
    if (movement_type) countQuery = countQuery.eq('movement_type', movement_type)

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
