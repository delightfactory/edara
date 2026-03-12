// ============================================================
// EDARA — Suppliers Module Services
// Supabase CRUD for: suppliers, supplier_contacts, supplier_brands
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    Supplier, SupplierWithRefs, SupplierInput, SupplierFilters,
    SupplierContact, SupplierContactInput,
    BrandLookup,
} from '@/lib/types/suppliers'

// ── Suppliers ────────────────────────────────────────────────

/**
 * Fetch suppliers with their associated brands.
 * Uses a two-step approach:
 * 1. Fetch suppliers with pagination
 * 2. Fetch supplier_brands join for those supplier IDs
 */
export async function getSuppliers(filters: SupplierFilters = {}): Promise<{ data: SupplierWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, is_manufacturer } = filters

    // Count
    let countQuery = supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true })

    if (search) countQuery = countQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
    if (is_manufacturer !== undefined) countQuery = countQuery.eq('is_manufacturer', is_manufacturer)

    const { count } = await countQuery
    const total = count || 0

    // Data
    let query = supabase
        .from('suppliers')
        .select('*')

    if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
    if (is_manufacturer !== undefined) query = query.eq('is_manufacturer', is_manufacturer)

    query = query
        .order('name')
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data: suppliers, error } = await query
    if (error) throw error

    if (!suppliers || suppliers.length === 0) return { data: [], total }

    // Fetch brands for these suppliers
    const supplierIds = suppliers.map(s => s.id)
    const { data: sbRows } = await supabase
        .from('supplier_brands')
        .select('supplier_id, brand:brands!brand_id ( id, name, logo_url )')
        .in('supplier_id', supplierIds)

    // Group brands by supplier
    const brandsMap: Record<string, BrandLookup[]> = {}
    for (const row of (sbRows || []) as unknown as Array<{ supplier_id: string; brand: BrandLookup | null }>) {
        const arr = brandsMap[row.supplier_id] ?? (brandsMap[row.supplier_id] = [])
        if (row.brand) arr.push(row.brand)
    }

    const result: SupplierWithRefs[] = suppliers.map(s => ({
        ...s,
        brands: brandsMap[s.id] || [],
    })) as SupplierWithRefs[]

    return { data: result, total }
}

export async function getSupplier(id: string): Promise<SupplierWithRefs | null> {
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error

    // Fetch brands
    const { data: sbRows } = await supabase
        .from('supplier_brands')
        .select('brand:brands!brand_id ( id, name, logo_url )')
        .eq('supplier_id', id)

    const brands = ((sbRows || []) as unknown as Array<{ brand: BrandLookup | null }>)
        .map(r => r.brand)
        .filter((b): b is BrandLookup => b !== null)

    return { ...data, brands } as SupplierWithRefs
}

/**
 * Create supplier + upsert supplier_brands
 */
export async function createSupplier(input: Partial<SupplierInput>, brandIds: string[]): Promise<Supplier> {
    const { data, error } = await supabase
        .from('suppliers')
        .insert(input)
        .select()
        .single()

    if (error) throw error

    // Insert brand associations
    if (brandIds.length > 0) {
        const rows = brandIds.map(bid => ({ supplier_id: data.id, brand_id: bid }))
        await supabase.from('supplier_brands').insert(rows)
    }

    return data as Supplier
}

/**
 * Update supplier + upsert supplier_brands (delete old + insert new)
 */
export async function updateSupplier(id: string, input: Partial<SupplierInput>, brandIds: string[]): Promise<Supplier> {
    const { data, error } = await supabase
        .from('suppliers')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error

    // Upsert brands: delete all old, insert new
    await supabase.from('supplier_brands').delete().eq('supplier_id', id)
    if (brandIds.length > 0) {
        const rows = brandIds.map(bid => ({ supplier_id: id, brand_id: bid }))
        await supabase.from('supplier_brands').insert(rows)
    }

    return data as Supplier
}

export async function deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Supplier Contacts ────────────────────────────────────────

export async function getSupplierContacts(supplierId: string): Promise<SupplierContact[]> {
    const { data, error } = await supabase
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('name')

    if (error) throw error
    return (data || []) as SupplierContact[]
}

export async function createSupplierContact(input: SupplierContactInput): Promise<SupplierContact> {
    const { data, error } = await supabase
        .from('supplier_contacts')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as SupplierContact
}

export async function updateSupplierContact(id: string, input: Partial<SupplierContactInput>): Promise<SupplierContact> {
    const { data, error } = await supabase
        .from('supplier_contacts')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as SupplierContact
}

export async function deleteSupplierContact(id: string): Promise<void> {
    const { error } = await supabase
        .from('supplier_contacts')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Brand Lookups ────────────────────────────────────────────

export async function getActiveBrands(): Promise<BrandLookup[]> {
    const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name')

    if (error) throw error
    return (data || []) as BrandLookup[]
}
