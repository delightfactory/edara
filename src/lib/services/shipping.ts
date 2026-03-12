// ============================================================
// EDARA — Shipping Companies Service
// CRUD for: shipping_companies
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type { ShippingCompany, ShippingCompanyInput } from '@/lib/types/shipping'

export async function getShippingCompanies(): Promise<ShippingCompany[]> {
    const { data, error } = await supabase
        .from('shipping_companies')
        .select('*')
        .order('name')

    if (error) throw error
    return (data || []) as ShippingCompany[]
}

export async function createShippingCompany(input: Partial<ShippingCompanyInput>): Promise<ShippingCompany> {
    const { data, error } = await supabase
        .from('shipping_companies')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as ShippingCompany
}

export async function updateShippingCompany(id: string, updates: Partial<ShippingCompanyInput>): Promise<ShippingCompany> {
    const { data, error } = await supabase
        .from('shipping_companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as ShippingCompany
}

export async function deleteShippingCompany(id: string): Promise<void> {
    const { error } = await supabase
        .from('shipping_companies')
        .delete()
        .eq('id', id)

    if (error) throw error
}
