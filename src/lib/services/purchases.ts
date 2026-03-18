// ============================================================
// EDARA — Purchases Module Services
// Supabase CRUD + RPC for: purchase_orders, purchase_receipts,
//   purchase_returns and their items
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    PurchaseOrderWithRefs, PurchaseOrderInput, PurchaseOrderFilters,
    PurchaseReceiptWithRefs, PurchaseReceiptFilters,
    PurchaseReceiptItemInput,
    PurchaseReturnWithRefs, PurchaseReturnInput, PurchaseReturnFilters,
} from '@/lib/types/purchases'

// ── Purchase Orders ──────────────────────────────────────────

const PO_SELECT = `
    *,
    supplier:suppliers!supplier_id ( name, code ),
    warehouse:warehouses!warehouse_id ( name ),
    branch:branches!branch_id ( name ),
    approver:profiles!approved_by ( full_name ),
    creator:profiles!created_by ( full_name )
`

const PO_DETAIL_SELECT = `
    *,
    supplier:suppliers!supplier_id ( name, code ),
    warehouse:warehouses!warehouse_id ( name ),
    branch:branches!branch_id ( name ),
    approver:profiles!approved_by ( full_name ),
    creator:profiles!created_by ( full_name ),
    items:purchase_order_items (
        *,
        product:products!product_id ( name, sku ),
        unit:units!unit_id ( name, symbol )
    )
`

export async function getPurchaseOrders(filters: PurchaseOrderFilters = {}): Promise<{ data: PurchaseOrderWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, supplier_id, warehouse_id, date_from, date_to } = filters

    let query = supabase
        .from('purchase_orders')
        .select(PO_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (supplier_id) query = query.eq('supplier_id', supplier_id)
    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id)
    if (date_from) query = query.gte('order_date', date_from)
    if (date_to) query = query.lte('order_date', date_to)
    if (search) query = query.or(`order_number.ilike.%${search}%`)

    query = query
        .order('order_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as PurchaseOrderWithRefs[], total: count || 0 }
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderWithRefs | null> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select(PO_DETAIL_SELECT)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as PurchaseOrderWithRefs
}

export async function createPurchaseOrder(input: PurchaseOrderInput, userId: string): Promise<PurchaseOrderWithRefs> {
    const { items, ...orderData } = input

    // Calculate totals
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const taxTotal = items.reduce((s, i) => s + i.tax_amount, 0)

    // Generate order number via RPC
    const { data: orderNum, error: numError } = await supabase.rpc('generate_order_number', { p_type: 'PO' })
    if (numError) throw numError

    // Create order
    const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
            ...orderData,
            order_number: orderNum as string,
            subtotal,
            tax_amount: taxTotal,
            total_amount: subtotal + taxTotal,
            status: 'draft',
            created_by: userId,
        })
        .select('id, order_number')
        .single()

    if (orderError) throw orderError

    // Create items
    const itemRows = items.map(item => ({
        ...item,
        order_id: order.id,
    }))

    const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemRows)

    if (itemsError) throw itemsError

    // Return full order
    return getPurchaseOrder(order.id) as Promise<PurchaseOrderWithRefs>
}

export async function updatePurchaseOrder(id: string, input: Partial<PurchaseOrderInput>): Promise<PurchaseOrderWithRefs> {
    const { items, ...orderData } = input as PurchaseOrderInput

    if (items) {
        // Recalculate totals
        const subtotal = items.reduce((s, i) => s + i.total, 0)
        const taxTotal = items.reduce((s, i) => s + i.tax_amount, 0)

        // Update order
        await supabase
            .from('purchase_orders')
            .update({
                ...orderData,
                subtotal,
                tax_amount: taxTotal,
                total_amount: subtotal + taxTotal,
            })
            .eq('id', id)

        // Replace items: delete old → insert new
        await supabase.from('purchase_order_items').delete().eq('order_id', id)
        const itemRows = items.map(item => ({ ...item, order_id: id }))
        await supabase.from('purchase_order_items').insert(itemRows)
    } else {
        await supabase
            .from('purchase_orders')
            .update(orderData)
            .eq('id', id)
    }

    return getPurchaseOrder(id) as Promise<PurchaseOrderWithRefs>
}

export async function deletePurchaseOrder(id: string): Promise<void> {
    // Items are cascade-deleted
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── RPC: Approve Purchase Order ──────────────────────────────

export async function approvePurchaseOrder(orderId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('approve_purchase_order', {
        p_po_id: orderId,
        p_user_id: userId,
    })

    if (error) throw new Error(error.message)
}

// ── Cancel Purchase Order ────────────────────────────────────

export async function cancelPurchaseOrder(orderId: string, reason: string, userId: string): Promise<void> {
    // Only draft/approved orders can be cancelled
    const { data: order, error: fetchError } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('id', orderId)
        .single()

    if (fetchError) throw fetchError
    if (!order) throw new Error('أمر الشراء غير موجود')
    if (order.status !== 'draft' && order.status !== 'approved') {
        throw new Error('لا يمكن إلغاء أمر شراء في هذه الحالة')
    }

    const { error } = await supabase
        .from('purchase_orders')
        .update({
            status: 'cancelled',
            cancel_reason: reason,
            cancelled_by: userId,
            cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)
}

// ── Purchase Receipts ────────────────────────────────────────

const RECEIPT_SELECT = `
    *,
    purchase_order:purchase_orders!purchase_order_id ( order_number, supplier:suppliers!supplier_id ( name ) ),
    warehouse:warehouses!warehouse_id ( name ),
    receiver:profiles!received_by ( full_name ),
    approver:profiles!approved_by ( full_name )
`

const RECEIPT_DETAIL_SELECT = `
    *,
    purchase_order:purchase_orders!purchase_order_id ( order_number, supplier:suppliers!supplier_id ( name ) ),
    warehouse:warehouses!warehouse_id ( name ),
    receiver:profiles!received_by ( full_name ),
    approver:profiles!approved_by ( full_name ),
    items:purchase_receipt_items (
        *,
        product:products!product_id ( name, sku ),
        unit:units!unit_id ( name, symbol )
    )
`

export async function getPurchaseReceipts(filters: PurchaseReceiptFilters = {}): Promise<{ data: PurchaseReceiptWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, purchase_order_id, warehouse_id, date_from, date_to } = filters

    let query = supabase
        .from('purchase_receipts')
        .select(RECEIPT_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (purchase_order_id) query = query.eq('purchase_order_id', purchase_order_id)
    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id)
    if (date_from) query = query.gte('received_date', date_from)
    if (date_to) query = query.lte('received_date', date_to)
    if (search) query = query.or(`receipt_number.ilike.%${search}%`)

    query = query
        .order('received_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as PurchaseReceiptWithRefs[], total: count || 0 }
}

export async function getPurchaseReceipt(id: string): Promise<PurchaseReceiptWithRefs | null> {
    const { data, error } = await supabase
        .from('purchase_receipts')
        .select(RECEIPT_DETAIL_SELECT)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as PurchaseReceiptWithRefs
}

export async function createPurchaseReceipt(
    purchaseOrderId: string,
    warehouseId: string,
    items: PurchaseReceiptItemInput[],
    userId: string,
    notes?: string
): Promise<PurchaseReceiptWithRefs> {
    // Generate receipt number via RPC
    const { data: receiptNum, error: numError } = await supabase.rpc('generate_order_number', { p_type: 'RC' })
    if (numError) throw numError

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
        .from('purchase_receipts')
        .insert({
            purchase_order_id: purchaseOrderId,
            warehouse_id: warehouseId,
            receipt_number: receiptNum as string,
            received_by: userId,
            status: 'pending_approval',
            notes,
        })
        .select('id')
        .single()

    if (receiptError) throw receiptError

    // Create items
    const itemRows = items.map(item => ({ ...item, receipt_id: receipt.id }))
    const { error: itemsError } = await supabase
        .from('purchase_receipt_items')
        .insert(itemRows)

    if (itemsError) throw itemsError

    return getPurchaseReceipt(receipt.id) as Promise<PurchaseReceiptWithRefs>
}

// ── RPC: Approve Purchase Receipt ────────────────────────────

export async function approvePurchaseReceipt(receiptId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('approve_purchase_receipt', {
        p_receipt_id: receiptId,
        p_user_id: userId,
    })

    if (error) throw new Error(error.message)
}

// ── Purchase Returns ─────────────────────────────────────────

const RETURN_SELECT = `
    *,
    supplier:suppliers!supplier_id ( name, code ),
    warehouse:warehouses!warehouse_id ( name ),
    purchase_order:purchase_orders!purchase_order_id ( order_number ),
    confirmer:profiles!confirmed_by ( full_name ),
    creator:profiles!created_by ( full_name )
`

const RETURN_DETAIL_SELECT = `
    *,
    supplier:suppliers!supplier_id ( name, code ),
    warehouse:warehouses!warehouse_id ( name ),
    purchase_order:purchase_orders!purchase_order_id ( order_number ),
    confirmer:profiles!confirmed_by ( full_name ),
    creator:profiles!created_by ( full_name ),
    items:purchase_return_items (
        *,
        product:products!product_id ( name, sku ),
        unit:units!unit_id ( name, symbol )
    )
`

export async function getPurchaseReturns(filters: PurchaseReturnFilters = {}): Promise<{ data: PurchaseReturnWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, supplier_id, date_from, date_to } = filters

    let query = supabase
        .from('purchase_returns')
        .select(RETURN_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (supplier_id) query = query.eq('supplier_id', supplier_id)
    if (date_from) query = query.gte('return_date', date_from)
    if (date_to) query = query.lte('return_date', date_to)
    if (search) query = query.or(`return_number.ilike.%${search}%`)

    query = query
        .order('return_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as PurchaseReturnWithRefs[], total: count || 0 }
}

export async function getPurchaseReturn(id: string): Promise<PurchaseReturnWithRefs | null> {
    const { data, error } = await supabase
        .from('purchase_returns')
        .select(RETURN_DETAIL_SELECT)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as PurchaseReturnWithRefs
}

export async function createPurchaseReturn(input: PurchaseReturnInput, userId: string): Promise<PurchaseReturnWithRefs> {
    const { items, ...returnData } = input

    // Calculate total
    const totalAmount = items.reduce((s, i) => s + i.total, 0)

    // Generate return number via RPC
    const { data: returnNum, error: numError } = await supabase.rpc('generate_order_number', { p_type: 'PR' })
    if (numError) throw numError

    const { data: ret, error: retError } = await supabase
        .from('purchase_returns')
        .insert({
            ...returnData,
            return_number: returnNum as string,
            total_amount: totalAmount,
            status: 'draft',
            created_by: userId,
        })
        .select('id')
        .single()

    if (retError) throw retError

    const itemRows = items.map(item => ({ ...item, return_id: ret.id }))
    const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(itemRows)

    if (itemsError) throw itemsError

    return getPurchaseReturn(ret.id) as Promise<PurchaseReturnWithRefs>
}

// ── RPC: Confirm Purchase Return ─────────────────────────────

export async function confirmPurchaseReturn(returnId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('confirm_purchase_return', {
        p_return_id: returnId,
        p_user_id: userId,
    })

    if (error) throw new Error(error.message || 'فشل تأكيد المرتجع')
}
