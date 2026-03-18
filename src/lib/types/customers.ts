// ============================================================
// EDARA — CRM Module Types
// Mirrors: customers, customer_contacts, customer_addresses
// ============================================================

// ── ENUMs ────────────────────────────────────────────────────

export type CustomerType = 'retail' | 'wholesale' | 'service_center' | 'car_wash' | 'distributor' | 'other'

export type CustomerClassification = 'A' | 'B' | 'C' | 'D'

export type PaymentTermsType = 'cash' | 'credit_7' | 'credit_15' | 'credit_30' | 'credit_45' | 'credit_60' | 'credit_90'

export type DeliveryMethod = 'direct' | 'company_van' | 'shipping_company'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
    retail: 'تجزئة',
    wholesale: 'جملة',
    service_center: 'مركز خدمة',
    car_wash: 'مغسلة سيارات',
    distributor: 'موزع',
    other: 'أخرى',
}

export const CLASSIFICATION_LABELS: Record<CustomerClassification, string> = {
    A: 'A — ممتاز',
    B: 'B — جيد',
    C: 'C — متوسط',
    D: 'D — ضعيف',
}

export const CLASSIFICATION_COLORS: Record<CustomerClassification, string> = {
    A: 'badge-success',
    B: 'badge-primary',
    C: 'badge-warning',
    D: 'badge-danger',
}

export const PAYMENT_TERMS_LABELS: Record<PaymentTermsType, string> = {
    cash: 'نقدي',
    credit_7: 'آجل 7 أيام',
    credit_15: 'آجل 15 يوم',
    credit_30: 'آجل 30 يوم',
    credit_45: 'آجل 45 يوم',
    credit_60: 'آجل 60 يوم',
    credit_90: 'آجل 90 يوم',
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
    direct: 'تسليم مباشر',
    company_van: 'سيارة الشركة',
    shipping_company: 'شركة شحن',
}

// ── Customer ─────────────────────────────────────────────────

export interface Customer {
    id: string
    code: string | null
    name: string
    phone: string | null
    email: string | null
    address: string | null
    gps_lat: number | null
    gps_lng: number | null
    customer_type: CustomerType
    classification: CustomerClassification
    credit_limit: number
    current_balance: number
    payment_terms: PaymentTermsType
    tax_registration_number: string | null
    default_delivery_method: DeliveryMethod
    price_list_id: string | null
    assigned_rep_id: string | null
    governorate_id: string | null
    city_id: string | null
    area_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CustomerWithRefs extends Customer {
    price_list?: { name: string } | null
    assigned_rep?: { full_name: string } | null
}

export interface CustomerInput {
    code: string | null
    name: string
    phone: string | null
    email: string | null
    address: string | null
    gps_lat: number | null
    gps_lng: number | null
    customer_type: CustomerType
    classification: CustomerClassification
    credit_limit: number
    payment_terms: PaymentTermsType
    tax_registration_number: string | null
    default_delivery_method: DeliveryMethod
    price_list_id: string | null
    assigned_rep_id: string | null
    governorate_id: string | null
    city_id: string | null
    area_id: string | null
    is_active: boolean
}

export interface CustomerFilters {
    page?: number
    pageSize?: number
    search?: string
    customer_type?: string
    classification?: string
    assigned_rep_id?: string
}

// ── Customer Contact ─────────────────────────────────────────

export interface CustomerContact {
    id: string
    customer_id: string
    name: string
    phone: string | null
    role: string | null
    is_primary: boolean
    created_at: string
}

export interface CustomerContactInput {
    customer_id: string
    name: string
    phone: string | null
    role: string | null
    is_primary: boolean
}

// ── Customer Address ─────────────────────────────────────────

export interface CustomerAddress {
    id: string
    customer_id: string
    label: string
    address: string
    gps_lat: number | null
    gps_lng: number | null
    is_default: boolean
    created_at: string
}

export interface CustomerAddressInput {
    customer_id: string
    label: string
    address: string
    gps_lat: number | null
    gps_lng: number | null
    is_default: boolean
}
