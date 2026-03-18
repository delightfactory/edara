// ============================================================
// EDARA — Geography Module Services
// Supabase CRUD for: governorates, cities, areas, branches
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    Governorate, CityWithRefs, AreaWithRefs,
    BranchWithRefs, BranchInput, BranchFilters,
} from '@/lib/types/geography'

// ── Governorates ─────────────────────────────────────────────

export async function getGovernorates(): Promise<Governorate[]> {
    const { data, error } = await supabase
        .from('governorates')
        .select('*')
        .order('sort_order')
        .order('name')

    if (error) throw error
    return (data || []) as Governorate[]
}

// ── Cities ───────────────────────────────────────────────────

export async function getCities(governorateId?: string): Promise<CityWithRefs[]> {
    let query = supabase
        .from('cities')
        .select(`
            *,
            governorate:governorates!governorate_id ( name )
        `)

    if (governorateId) query = query.eq('governorate_id', governorateId)

    query = query.order('sort_order').order('name')

    const { data, error } = await query
    if (error) throw error
    return (data || []) as CityWithRefs[]
}

// ── Areas ────────────────────────────────────────────────────

export async function getAreas(cityId?: string): Promise<AreaWithRefs[]> {
    let query = supabase
        .from('areas')
        .select(`
            *,
            city:cities!city_id ( name )
        `)

    if (cityId) query = query.eq('city_id', cityId)

    query = query.order('name')

    const { data, error } = await query
    if (error) throw error
    return (data || []) as AreaWithRefs[]
}

// ── Branches ─────────────────────────────────────────────────

export async function getBranches(filters: BranchFilters = {}): Promise<{ data: BranchWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, city_id, is_active } = filters

    let query = supabase
        .from('branches')
        .select(`
            *,
            city:cities!city_id ( name, governorate:governorates!governorate_id ( name ) ),
            manager:profiles!manager_id ( full_name )
        `, { count: 'exact' })

    if (city_id) query = query.eq('city_id', city_id)
    if (is_active !== undefined) query = query.eq('is_active', is_active)
    if (search) query = query.ilike('name', `%${search}%`)

    query = query
        .order('name')
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { data: (data || []) as BranchWithRefs[], total: count || 0 }
}

export async function getBranch(id: string): Promise<BranchWithRefs | null> {
    const { data, error } = await supabase
        .from('branches')
        .select(`
            *,
            city:cities!city_id ( name, governorate:governorates!governorate_id ( name ) ),
            manager:profiles!manager_id ( full_name )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as BranchWithRefs
}

export async function createBranch(input: Partial<BranchInput>): Promise<BranchWithRefs> {
    const { data, error } = await supabase
        .from('branches')
        .insert(input)
        .select(`
            *,
            city:cities!city_id ( name, governorate:governorates!governorate_id ( name ) ),
            manager:profiles!manager_id ( full_name )
        `)
        .single()

    if (error) throw error
    return data as BranchWithRefs
}

export async function updateBranch(id: string, input: Partial<BranchInput>): Promise<BranchWithRefs> {
    const { data, error } = await supabase
        .from('branches')
        .update(input)
        .eq('id', id)
        .select(`
            *,
            city:cities!city_id ( name, governorate:governorates!governorate_id ( name ) ),
            manager:profiles!manager_id ( full_name )
        `)
        .single()

    if (error) throw error
    return data as BranchWithRefs
}

export async function deleteBranch(id: string): Promise<void> {
    const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Lookup helpers ───────────────────────────────────────────

export async function getActiveBranches(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

    if (error) throw error
    return (data || []) as { id: string; name: string }[]
}
