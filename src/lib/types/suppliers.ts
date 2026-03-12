// ============================================================
// EDARA — Suppliers Module Types
// Mirrors: suppliers, supplier_contacts, supplier_brands
// ============================================================

import type { PaymentTermsType } from '@/lib/types/customers'

export { PAYMENT_TERMS_LABELS } from '@/lib/types/customers'

// ── Supplier ─────────────────────────────────────────────────

export interface Supplier {
    id: string
    code: string | null
    name: string
    phone: string | null
    email: string | null
    address: string | null
    payment_terms: PaymentTermsType
    is_manufacturer: boolean
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface SupplierWithRefs extends Supplier {
    brands: BrandLookup[]
}

export interface SupplierInput {
    code: string | null
    name: string
    phone: string | null
    email: string | null
    address: string | null
    payment_terms: PaymentTermsType
    is_manufacturer: boolean
    is_active: boolean
}

export interface SupplierFilters {
    page?: number
    pageSize?: number
    search?: string
    is_manufacturer?: boolean
}

// ── Supplier Contact ─────────────────────────────────────────

export interface SupplierContact {
    id: string
    supplier_id: string
    name: string
    phone: string | null
    role: string | null
    created_at: string
}

export interface SupplierContactInput {
    supplier_id: string
    name: string
    phone: string | null
    role: string | null
}

// ── Brand Lookup (for multi-select) ──────────────────────────

export interface BrandLookup {
    id: string
    name: string
    logo_url: string | null
}
