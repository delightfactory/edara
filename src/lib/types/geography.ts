// ============================================================
// EDARA — Geography Module Types
// Mirrors: governorates, cities, areas, branches
// ============================================================

// ── Governorate ──────────────────────────────────────────────

export interface Governorate {
    id: string
    name: string
    name_en: string | null
    sort_order: number
    created_at: string
}

// ── City ─────────────────────────────────────────────────────

export interface City {
    id: string
    governorate_id: string
    name: string
    name_en: string | null
    sort_order: number
    created_at: string
}

export interface CityWithRefs extends City {
    governorate?: { name: string } | null
}

// ── Area ─────────────────────────────────────────────────────

export interface Area {
    id: string
    city_id: string
    name: string
    created_at: string
}

export interface AreaWithRefs extends Area {
    city?: { name: string } | null
}

// ── Branch ───────────────────────────────────────────────────

export interface Branch {
    id: string
    name: string
    city_id: string | null
    address: string | null
    phone: string | null
    manager_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface BranchWithRefs extends Branch {
    city?: { name: string; governorate?: { name: string } | null } | null
    manager?: { full_name: string } | null
}

export interface BranchInput {
    name: string
    city_id: string | null
    address: string | null
    phone: string | null
    manager_id: string | null
    is_active: boolean
}

export interface BranchFilters {
    page?: number
    pageSize?: number
    search?: string
    city_id?: string
    is_active?: boolean
}
