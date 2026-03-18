// ============================================================
// EDARA — Sales Module Types
// Mirrors: sales_orders, sales_order_items, sales_returns,
//          sales_return_items, discount_rules, discount_rule_items,
//          payment_proofs
// ============================================================

import type { PaymentTermsType, DeliveryMethod } from './customers'

// ── ENUMs ────────────────────────────────────────────────────

export type OrderStatus = 'draft' | 'confirmed' | 'cancelled'

export type PaymentProofStatus = 'pending' | 'approved' | 'rejected'

export type DiscountType = 'product' | 'invoice' | 'quantity' | 'bundle' | 'cash_payment'

export type DiscountScope = 'company' | 'customer' | 'category' | 'product'

// ── Labels ───────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    draft: 'مسودة',
    confirmed: 'مؤكد',
    cancelled: 'ملغى',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    draft: 'badge-secondary',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
}

export const PAYMENT_PROOF_STATUS_LABELS: Record<PaymentProofStatus, string> = {
    pending: 'في الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
}

export const PAYMENT_PROOF_STATUS_COLORS: Record<PaymentProofStatus, string> = {
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
    product: 'خصم منتج',
    invoice: 'خصم فاتورة',
    quantity: 'خصم كمية',
    bundle: 'عرض باندل',
    cash_payment: 'خصم دفع نقدي',
}

export const DISCOUNT_SCOPE_LABELS: Record<DiscountScope, string> = {
    company: 'الشركة بالكامل',
    customer: 'عميل محدد',
    category: 'فئة منتجات',
    product: 'منتج محدد',
}

// ── Sales Order ──────────────────────────────────────────────

export interface SalesOrder {
    id: string
    order_number: string
    customer_id: string
    sales_rep_id: string | null
    warehouse_id: string
    branch_id: string | null
    status: OrderStatus
    order_date: string
    delivery_method: DeliveryMethod
    shipping_company_id: string | null
    delivery_address_id: string | null
    payment_method: PaymentTermsType
    vault_id: string | null
    custody_id: string | null
    subtotal: number
    discount_amount: number
    discount_percent: number
    tax_amount: number
    total_amount: number
    notes: string | null
    confirmed_by: string | null
    confirmed_at: string | null
    cancelled_by: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface SalesOrderWithRefs extends SalesOrder {
    customer?: { name: string; code: string | null; current_balance: number; credit_limit: number } | null
    sales_rep?: { employee?: { profile?: { full_name: string } | null } | null } | null
    warehouse?: { name: string } | null
    branch?: { name: string } | null
    shipping_company?: { name: string } | null
    vault?: { name: string } | null
    custody?: { employee?: { profile?: { full_name: string } | null } | null } | null
    confirmer?: { full_name: string } | null
    canceller?: { full_name: string } | null
    creator?: { full_name: string } | null
    items?: SalesOrderItemWithRefs[]
}

export interface SalesOrderInput {
    customer_id: string
    sales_rep_id: string | null
    warehouse_id: string
    branch_id: string | null
    order_date: string
    delivery_method: DeliveryMethod
    shipping_company_id: string | null
    delivery_address_id: string | null
    payment_method: PaymentTermsType
    vault_id: string | null
    custody_id: string | null
    notes: string | null
    items: SalesOrderItemInput[]
}

export interface SalesOrderFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: OrderStatus
    customer_id?: string
    sales_rep_id?: string
    warehouse_id?: string
    payment_method?: PaymentTermsType
    date_from?: string
    date_to?: string
}

// ── Sales Order Item ─────────────────────────────────────────

export interface SalesOrderItem {
    id: string
    order_id: string
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    discount_amount: number
    discount_percent: number
    tax_amount: number
    total: number
    conversion_factor: number
    base_quantity: number
    created_at: string
}

export interface SalesOrderItemWithRefs extends SalesOrderItem {
    product?: { name: string; sku: string | null } | null
    unit?: { name: string; symbol: string } | null
}

export interface SalesOrderItemInput {
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    discount_amount: number
    discount_percent: number
    tax_amount: number
    total: number
    conversion_factor: number
    base_quantity: number
}

// ── Sales Return ─────────────────────────────────────────────

export interface SalesReturn {
    id: string
    return_number: string
    order_id: string
    customer_id: string
    warehouse_id: string
    branch_id: string | null
    status: OrderStatus
    return_date: string
    total_amount: number
    reason: string | null
    notes: string | null
    confirmed_by: string | null
    confirmed_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface SalesReturnWithRefs extends SalesReturn {
    order?: { order_number: string } | null
    customer?: { name: string; code: string | null } | null
    warehouse?: { name: string } | null
    branch?: { name: string } | null
    confirmer?: { full_name: string } | null
    creator?: { full_name: string } | null
    items?: SalesReturnItemWithRefs[]
}

export interface SalesReturnInput {
    order_id: string
    customer_id: string
    warehouse_id: string
    branch_id: string | null
    return_date: string
    total_amount: number
    reason: string | null
    notes: string | null
    items: SalesReturnItemInput[]
}

export interface SalesReturnFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: OrderStatus
    customer_id?: string
    order_id?: string
    date_from?: string
    date_to?: string
}

// ── Sales Return Item ────────────────────────────────────────

export interface SalesReturnItem {
    id: string
    return_id: string
    order_item_id: string | null
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    total: number
    conversion_factor: number
    base_quantity: number
    created_at: string
}

export interface SalesReturnItemWithRefs extends SalesReturnItem {
    product?: { name: string; sku: string | null } | null
    unit?: { name: string; symbol: string } | null
}

export interface SalesReturnItemInput {
    order_item_id: string | null
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    total: number
    conversion_factor: number
    base_quantity: number
}

// ── Discount Rule ────────────────────────────────────────────

export interface DiscountRule {
    id: string
    name: string
    type: DiscountType
    scope: DiscountScope
    scope_id: string | null
    value: number
    is_percentage: boolean
    min_qty: number | null
    max_qty: number | null
    start_date: string | null
    end_date: string | null
    is_active: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface DiscountRuleInput {
    name: string
    type: DiscountType
    scope: DiscountScope
    scope_id: string | null
    value: number
    is_percentage: boolean
    min_qty: number | null
    max_qty: number | null
    start_date: string | null
    end_date: string | null
    is_active: boolean
}

export interface DiscountRuleFilters {
    page?: number
    pageSize?: number
    search?: string
    type?: DiscountType
    scope?: DiscountScope
    is_active?: boolean
}

// ── Discount Rule Item ───────────────────────────────────────

export interface DiscountRuleItem {
    id: string
    rule_id: string
    product_id: string
    quantity: number
    free_quantity: number
    created_at: string
}

export interface DiscountRuleItemWithRefs extends DiscountRuleItem {
    product?: { name: string; sku: string | null } | null
}

export interface DiscountRuleItemInput {
    product_id: string
    quantity: number
    free_quantity: number
}

// ── Payment Proof ────────────────────────────────────────────

export interface PaymentProof {
    id: string
    reference_type: string
    reference_id: string | null
    image_url: string
    payment_method: 'bank_transfer' | 'instapay'
    amount: number
    status: PaymentProofStatus
    uploaded_by: string | null
    reviewed_by: string | null
    reviewed_at: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface PaymentProofWithRefs extends PaymentProof {
    uploader?: { full_name: string } | null
    reviewer?: { full_name: string } | null
}

export interface PaymentProofInput {
    reference_type: string
    reference_id: string | null
    image_url: string
    payment_method: 'bank_transfer' | 'instapay'
    amount: number
    notes: string | null
}

export interface PaymentProofFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: PaymentProofStatus
    reference_type?: string
    date_from?: string
    date_to?: string
}
