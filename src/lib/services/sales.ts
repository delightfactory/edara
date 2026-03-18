// ============================================================
// EDARA — Sales Module Services
// Supabase CRUD + RPC for: sales_orders, sales_returns,
//   discount_rules, payment_proofs
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    SalesOrderWithRefs, SalesOrderInput, SalesOrderItemInput, SalesOrderFilters,
    SalesReturnWithRefs, SalesReturnInput, SalesReturnFilters,
    DiscountRule, DiscountRuleInput, DiscountRuleFilters,
    DiscountRuleItemInput,
    PaymentProofWithRefs, PaymentProofInput, PaymentProofFilters,
} from '@/lib/types/sales'

// ── Sales Orders ─────────────────────────────────────────────

const SO_SELECT = `
    *,
    customer:customers!customer_id ( name, code, current_balance, credit_limit ),
    sales_rep:sales_reps!sales_rep_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
    warehouse:warehouses!warehouse_id ( name ),
    branch:branches!branch_id ( name ),
    shipping_company:shipping_companies!shipping_company_id ( name ),
    vault:vaults!vault_id ( name ),
    custody:custody_accounts!custody_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
    confirmer:profiles!confirmed_by ( full_name ),
    canceller:profiles!cancelled_by ( full_name ),
    creator:profiles!created_by ( full_name )
`

const SO_DETAIL_SELECT = `
    *,
    customer:customers!customer_id ( name, code, current_balance, credit_limit ),
    sales_rep:sales_reps!sales_rep_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
    warehouse:warehouses!warehouse_id ( name ),
    branch:branches!branch_id ( name ),
    shipping_company:shipping_companies!shipping_company_id ( name ),
    vault:vaults!vault_id ( name ),
    custody:custody_accounts!custody_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
    confirmer:profiles!confirmed_by ( full_name ),
    canceller:profiles!cancelled_by ( full_name ),
    creator:profiles!created_by ( full_name ),
    items:sales_order_items (
        *,
        product:products!product_id ( name, sku ),
        unit:units!unit_id ( name, symbol )
    )
`

export async function getSalesOrders(filters: SalesOrderFilters = {}): Promise<{ data: SalesOrderWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, customer_id, sales_rep_id, warehouse_id, payment_method, date_from, date_to } = filters

    let query = supabase
        .from('sales_orders')
        .select(SO_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (customer_id) query = query.eq('customer_id', customer_id)
    if (sales_rep_id) query = query.eq('sales_rep_id', sales_rep_id)
    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id)
    if (payment_method) query = query.eq('payment_method', payment_method)
    if (date_from) query = query.gte('order_date', date_from)
    if (date_to) query = query.lte('order_date', date_to)
    if (search) query = query.or(`order_number.ilike.%${search}%`)

    query = query
        .order('order_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as SalesOrderWithRefs[], total: count || 0 }
}

export async function getSalesOrder(id: string): Promise<SalesOrderWithRefs | null> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select(SO_DETAIL_SELECT)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as SalesOrderWithRefs
}

/** Convert empty string to null for UUID fields */
function uuidOrNull(val: string | null | undefined): string | null {
    return val && val.trim().length > 0 ? val : null
}

/** Sanitize an item row to ensure only valid DB columns with numeric values are sent */
function sanitizeOrderItem(item: SalesOrderItemInput, orderId: string) {
    return {
        order_id: orderId,
        product_id: uuidOrNull(item.product_id),
        unit_id: uuidOrNull(item.unit_id),
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        discount_amount: Number(item.discount_amount) || 0,
        discount_percent: Number(item.discount_percent) || 0,
        tax_amount: Number(item.tax_amount) || 0,
        total: Number(item.total) || 0,
        conversion_factor: Number(item.conversion_factor) || 1,
        base_quantity: Number(item.base_quantity) || 0,
    }
}

export async function createSalesOrder(input: SalesOrderInput, userId: string): Promise<SalesOrderWithRefs> {
    const { items, ...orderData } = input

    // Validate items have required UUID fields
    for (let i = 0; i < items.length; i++) {
        const item = items[i]!
        if (!item.product_id || item.product_id.trim() === '') {
            throw new Error(`البند ${i + 1}: يجب اختيار المنتج`)
        }
        if (!item.unit_id || item.unit_id.trim() === '') {
            throw new Error(`البند ${i + 1}: يجب اختيار الوحدة`)
        }
    }

    // Calculate totals
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
    const discountTotal = items.reduce((s, i) => s + Number(i.discount_amount), 0)
    const taxTotal = items.reduce((s, i) => s + Number(i.tax_amount), 0)

    // Generate order number via RPC
    const { data: orderNum, error: numError } = await supabase.rpc('generate_order_number', { p_type: 'SO' })
    if (numError) throw numError

    const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
            customer_id: orderData.customer_id,
            sales_rep_id: uuidOrNull(orderData.sales_rep_id),
            warehouse_id: orderData.warehouse_id,
            branch_id: uuidOrNull(orderData.branch_id),
            order_date: orderData.order_date,
            delivery_method: orderData.delivery_method,
            shipping_company_id: uuidOrNull(orderData.shipping_company_id),
            delivery_address_id: uuidOrNull(orderData.delivery_address_id),
            payment_method: orderData.payment_method,
            vault_id: uuidOrNull(orderData.vault_id),
            custody_id: uuidOrNull(orderData.custody_id),
            notes: orderData.notes || null,
            order_number: orderNum as string,
            subtotal,
            discount_amount: discountTotal,
            tax_amount: taxTotal,
            total_amount: subtotal - discountTotal + taxTotal,
            status: 'draft',
            created_by: userId,
        })
        .select('id, order_number')
        .single()

    if (orderError) throw orderError

    // Create items — explicitly map columns to avoid sending extra fields
    const itemRows = items.map(item => sanitizeOrderItem(item, order.id))

    const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(itemRows)

    if (itemsError) {
        // If insert fails due to column mismatch (e.g. discount_percent missing),
        // retry without discount_percent
        if (itemsError.code === 'PGRST204' || itemsError.message?.includes('column')) {
            const fallbackRows = itemRows.map(({ discount_percent: _, ...rest }) => rest)
            const { error: retryError } = await supabase
                .from('sales_order_items')
                .insert(fallbackRows)
            if (retryError) throw retryError
        } else {
            throw itemsError
        }
    }

    return getSalesOrder(order.id) as Promise<SalesOrderWithRefs>
}

export async function updateSalesOrder(id: string, input: Partial<SalesOrderInput>): Promise<SalesOrderWithRefs> {
    const { items, ...orderData } = input as SalesOrderInput

    if (items) {
        const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
        const discountTotal = items.reduce((s, i) => s + Number(i.discount_amount), 0)
        const taxTotal = items.reduce((s, i) => s + Number(i.tax_amount), 0)

        await supabase
            .from('sales_orders')
            .update({
                ...orderData,
                subtotal,
                discount_amount: discountTotal,
                tax_amount: taxTotal,
                total_amount: subtotal - discountTotal + taxTotal,
            })
            .eq('id', id)

        // Replace items — explicitly map columns
        await supabase.from('sales_order_items').delete().eq('order_id', id)
        const itemRows = items.map(item => sanitizeOrderItem(item, id))
        await supabase.from('sales_order_items').insert(itemRows)
    } else {
        await supabase
            .from('sales_orders')
            .update(orderData)
            .eq('id', id)
    }

    return getSalesOrder(id) as Promise<SalesOrderWithRefs>
}

export async function deleteSalesOrder(id: string): Promise<void> {
    const { error } = await supabase.from('sales_orders').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── RPC: Confirm / Cancel Sales Order ────────────────────────

export async function confirmSalesOrder(orderId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('confirm_sales_order', {
        p_order_id: orderId,
        p_user_id: userId,
    })

    if (error) throw new Error(error.message)
}

export async function cancelSalesOrder(orderId: string, reason: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_sales_order', {
        p_order_id: orderId,
        p_reason: reason,
        p_user_id: userId,
    })

    if (error) throw new Error(error.message)
}

// ── RPC: Get Product Price ───────────────────────────────────

export async function getProductPrice(productId: string, unitId: string, customerId: string | null): Promise<number> {
    const { data, error } = await supabase.rpc('get_product_price', {
        p_product_id: productId,
        p_unit_id: unitId || null,
        p_customer_id: customerId || null,
    })

    if (error) throw new Error(error.message)
    return (data as number) || 0
}

// ── RPC: Check Credit Limit ─────────────────────────────────

export async function checkCreditLimit(customerId: string, amount: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_credit_limit', {
        p_customer_id: customerId,
        p_amount: amount,
    })

    if (error) throw new Error(error.message)
    return data as boolean
}

// ── Sales Returns ────────────────────────────────────────────

const SR_SELECT = `
    *,
    order:sales_orders!order_id ( order_number ),
    customer:customers!customer_id ( name, code ),
    warehouse:warehouses!warehouse_id ( name ),
    branch:branches!branch_id ( name ),
    confirmer:profiles!confirmed_by ( full_name ),
    creator:profiles!created_by ( full_name )
`

const SR_DETAIL_SELECT = `
    *,
    order:sales_orders!order_id ( order_number ),
    customer:customers!customer_id ( name, code ),
    warehouse:warehouses!warehouse_id ( name ),
    branch:branches!branch_id ( name ),
    confirmer:profiles!confirmed_by ( full_name ),
    creator:profiles!created_by ( full_name ),
    items:sales_return_items (
        *,
        product:products!product_id ( name, sku ),
        unit:units!unit_id ( name, symbol )
    )
`

export async function getSalesReturns(filters: SalesReturnFilters = {}): Promise<{ data: SalesReturnWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, customer_id, order_id, date_from, date_to } = filters

    let query = supabase
        .from('sales_returns')
        .select(SR_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (customer_id) query = query.eq('customer_id', customer_id)
    if (order_id) query = query.eq('order_id', order_id)
    if (date_from) query = query.gte('return_date', date_from)
    if (date_to) query = query.lte('return_date', date_to)
    if (search) query = query.or(`return_number.ilike.%${search}%`)

    query = query
        .order('return_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as SalesReturnWithRefs[], total: count || 0 }
}

export async function getSalesReturn(id: string): Promise<SalesReturnWithRefs | null> {
    const { data, error } = await supabase
        .from('sales_returns')
        .select(SR_DETAIL_SELECT)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as SalesReturnWithRefs
}

export async function createSalesReturn(input: SalesReturnInput, userId: string): Promise<SalesReturnWithRefs> {
    const { items, ...returnData } = input

    const totalAmount = items.reduce((s, i) => s + i.total, 0)

    // Generate return number via RPC
    const { data: returnNum, error: numError } = await supabase.rpc('generate_order_number', { p_type: 'SR' })
    if (numError) throw numError

    const { data: ret, error: retError } = await supabase
        .from('sales_returns')
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
        .from('sales_return_items')
        .insert(itemRows)

    if (itemsError) throw itemsError

    return getSalesReturn(ret.id) as Promise<SalesReturnWithRefs>
}

// ── RPC: Confirm Sales Return ────────────────────────────────

export async function confirmSalesReturn(returnId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('confirm_sales_return', {
        p_return_id: returnId,
        p_user_id: userId,
    })

    if (error) throw new Error(error.message || 'فشل تأكيد المرتجع')
}

// ── Discount Rules ───────────────────────────────────────────

export async function getDiscountRules(filters: DiscountRuleFilters = {}): Promise<{ data: DiscountRule[]; total: number }> {
    const { page = 1, pageSize = 25, search, type, scope, is_active } = filters

    let query = supabase
        .from('discount_rules')
        .select('*', { count: 'exact' })

    if (type) query = query.eq('type', type)
    if (scope) query = query.eq('scope', scope)
    if (is_active !== undefined) query = query.eq('is_active', is_active)
    if (search) query = query.ilike('name', `%${search}%`)

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as DiscountRule[], total: count || 0 }
}

export async function getDiscountRule(id: string): Promise<DiscountRule | null> {
    const { data, error } = await supabase
        .from('discount_rules')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as DiscountRule
}

export async function createDiscountRule(input: DiscountRuleInput, items: DiscountRuleItemInput[] = [], userId?: string): Promise<DiscountRule> {
    const { data, error } = await supabase
        .from('discount_rules')
        .insert({ ...input, created_by: userId })
        .select()
        .single()

    if (error) throw new Error(error.message)

    if (items.length > 0) {
        const itemRows = items.map(item => ({ ...item, rule_id: data.id }))
        await supabase.from('discount_rule_items').insert(itemRows)
    }

    return data as DiscountRule
}

export async function updateDiscountRule(id: string, input: Partial<DiscountRuleInput>): Promise<DiscountRule> {
    const { data, error } = await supabase
        .from('discount_rules')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as DiscountRule
}

export async function deleteDiscountRule(id: string): Promise<void> {
    const { error } = await supabase.from('discount_rules').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Payment Proofs ───────────────────────────────────────────

export async function getPaymentProofs(filters: PaymentProofFilters = {}): Promise<{ data: PaymentProofWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, status, reference_type, date_from, date_to } = filters

    let query = supabase
        .from('payment_proofs')
        .select(`
            *,
            uploader:profiles!uploaded_by ( full_name ),
            reviewer:profiles!reviewed_by ( full_name )
        `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (reference_type) query = query.eq('reference_type', reference_type)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data || []) as PaymentProofWithRefs[], total: count || 0 }
}

export async function createPaymentProof(input: PaymentProofInput, userId: string): Promise<PaymentProofWithRefs> {
    const { data, error } = await supabase
        .from('payment_proofs')
        .insert({
            ...input,
            uploaded_by: userId,
            status: 'pending',
        })
        .select(`
            *,
            uploader:profiles!uploaded_by ( full_name )
        `)
        .single()

    if (error) throw new Error(error.message)
    return data as PaymentProofWithRefs
}

export async function updatePaymentProofStatus(
    id: string,
    status: 'approved' | 'rejected',
    userId: string,
    notes?: string
): Promise<void> {
    const { error } = await supabase
        .from('payment_proofs')
        .update({
            status,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            notes: notes || null,
        })
        .eq('id', id)

    if (error) throw new Error(error.message)
}
