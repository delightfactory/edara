// ============================================================
// EDARA — Purchases Module Types
// Mirrors: purchase_orders, purchase_order_items, purchase_receipts,
//          purchase_receipt_items, purchase_returns, purchase_return_items
// ============================================================

import type { PaymentTermsType } from './customers'

// ── ENUMs ────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled'

export type ReceiptStatus = 'pending_approval' | 'approved' | 'rejected'

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
    draft: 'مسودة',
    approved: 'معتمد',
    partially_received: 'مستلم جزئياً',
    received: 'مستلم بالكامل',
    cancelled: 'ملغى',
}

export const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
    draft: 'badge-secondary',
    approved: 'badge-primary',
    partially_received: 'badge-warning',
    received: 'badge-success',
    cancelled: 'badge-danger',
}

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
    pending_approval: 'في انتظار الموافقة',
    approved: 'تم الاستلام',
    rejected: 'مرفوض',
}

export const RECEIPT_STATUS_COLORS: Record<ReceiptStatus, string> = {
    pending_approval: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
}

export type PurchaseReturnStatus = 'draft' | 'confirmed' | 'cancelled'

export const PR_STATUS_LABELS: Record<PurchaseReturnStatus, string> = {
    draft: 'مسودة',
    confirmed: 'مؤكد',
    cancelled: 'ملغى',
}

export const PR_STATUS_COLORS: Record<PurchaseReturnStatus, string> = {
    draft: 'badge-secondary',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
}

// ── Purchase Order ───────────────────────────────────────────

export interface PurchaseOrder {
    id: string
    order_number: string
    supplier_id: string
    warehouse_id: string
    branch_id: string | null
    status: PurchaseOrderStatus
    order_date: string
    payment_method: PaymentTermsType
    subtotal: number
    discount_amount: number
    discount_percent: number
    tax_amount: number
    total_amount: number
    notes: string | null
    approved_by: string | null
    approved_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface PurchaseOrderWithRefs extends PurchaseOrder {
    supplier?: { name: string; code: string | null } | null
    warehouse?: { name: string } | null
    branch?: { name: string } | null
    approver?: { full_name: string } | null
    creator?: { full_name: string } | null
    items?: PurchaseOrderItemWithRefs[]
}

export interface PurchaseOrderInput {
    supplier_id: string
    warehouse_id: string
    branch_id: string | null
    order_date: string
    payment_method: PaymentTermsType
    notes: string | null
    items: PurchaseOrderItemInput[]
}

export interface PurchaseOrderFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: PurchaseOrderStatus
    supplier_id?: string
    warehouse_id?: string
    date_from?: string
    date_to?: string
}

// ── Purchase Order Item ──────────────────────────────────────

export interface PurchaseOrderItem {
    id: string
    order_id: string
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    tax_amount: number
    total: number
    conversion_factor: number
    base_quantity: number
    received_quantity: number
    created_at: string
}

export interface PurchaseOrderItemWithRefs extends PurchaseOrderItem {
    product?: { name: string; sku: string | null } | null
    unit?: { name: string; symbol: string } | null
}

export interface PurchaseOrderItemInput {
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    tax_amount: number
    total: number
    conversion_factor: number
    base_quantity: number
}

// ── Purchase Receipt ─────────────────────────────────────────

export interface PurchaseReceipt {
    id: string
    receipt_number: string
    purchase_order_id: string
    warehouse_id: string
    status: ReceiptStatus
    received_date: string
    received_by: string | null
    approved_by: string | null
    approved_at: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface PurchaseReceiptWithRefs extends PurchaseReceipt {
    purchase_order?: { order_number: string; supplier?: { name: string } | null } | null
    warehouse?: { name: string } | null
    receiver?: { full_name: string } | null
    approver?: { full_name: string } | null
    items?: PurchaseReceiptItemWithRefs[]
}

export interface PurchaseReceiptFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: ReceiptStatus
    purchase_order_id?: string
    warehouse_id?: string
    date_from?: string
    date_to?: string
}

// ── Purchase Receipt Item ────────────────────────────────────

export interface PurchaseReceiptItem {
    id: string
    receipt_id: string
    order_item_id: string
    product_id: string
    unit_id: string
    ordered_quantity: number
    received_quantity: number
    accepted_quantity: number
    rejected_quantity: number
    rejection_reason: string | null
    batch_number: string | null
    expiry_date: string | null
    conversion_factor: number
    base_quantity: number
    created_at: string
}

export interface PurchaseReceiptItemWithRefs extends PurchaseReceiptItem {
    product?: { name: string; sku: string | null } | null
    unit?: { name: string; symbol: string } | null
}

export interface PurchaseReceiptItemInput {
    order_item_id: string
    product_id: string
    unit_id: string
    ordered_quantity: number
    received_quantity: number
    accepted_quantity: number
    rejected_quantity: number
    rejection_reason: string | null
    batch_number: string | null
    expiry_date: string | null
    conversion_factor: number
    base_quantity: number
}

// ── Purchase Return ──────────────────────────────────────────

export interface PurchaseReturn {
    id: string
    return_number: string
    supplier_id: string
    warehouse_id: string
    purchase_order_id: string | null
    branch_id: string | null
    status: 'draft' | 'confirmed' | 'cancelled'
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

export interface PurchaseReturnWithRefs extends PurchaseReturn {
    supplier?: { name: string; code: string | null } | null
    warehouse?: { name: string } | null
    purchase_order?: { order_number: string } | null
    confirmer?: { full_name: string } | null
    creator?: { full_name: string } | null
    items?: PurchaseReturnItemWithRefs[]
}

export interface PurchaseReturnInput {
    supplier_id: string
    warehouse_id: string
    purchase_order_id: string | null
    branch_id: string | null
    return_date: string
    total_amount: number
    reason: string | null
    notes: string | null
    items: PurchaseReturnItemInput[]
}

export interface PurchaseReturnFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    supplier_id?: string
    date_from?: string
    date_to?: string
}

// ── Purchase Return Item ─────────────────────────────────────

export interface PurchaseReturnItem {
    id: string
    return_id: string
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    total: number
    conversion_factor: number
    base_quantity: number
    created_at: string
}

export interface PurchaseReturnItemWithRefs extends PurchaseReturnItem {
    product?: { name: string; sku: string | null } | null
    unit?: { name: string; symbol: string } | null
}

export interface PurchaseReturnItemInput {
    product_id: string
    unit_id: string
    quantity: number
    unit_price: number
    total: number
    conversion_factor: number
    base_quantity: number
}
