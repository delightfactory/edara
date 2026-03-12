// ============================================================
// EDARA — Shipping Companies Types
// Mirrors: shipping_companies table
// ============================================================

export interface ShippingCompany {
    id: string
    name: string
    contact_person: string | null
    phone: string | null
    email: string | null
    website: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type ShippingCompanyInput = Omit<ShippingCompany, 'id' | 'created_at' | 'updated_at'>
