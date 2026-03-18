// ============================================================
// EDARA — HR Module Types
// Mirrors: employees, sales_reps
// ============================================================

// ── ENUMs ────────────────────────────────────────────────────

export type RepType = 'van_sales' | 'pre_sales' | 'delivery_driver'

export const REP_TYPE_LABELS: Record<RepType, string> = {
    van_sales: 'مبيعات مباشرة (Van)',
    pre_sales: 'مبيعات مسبقة (Pre-Sales)',
    delivery_driver: 'سائق توصيل',
}

export const REP_TYPE_BADGES: Record<RepType, string> = {
    van_sales: 'badge-primary',
    pre_sales: 'badge-info',
    delivery_driver: 'badge-warning',
}

// ── Employee ─────────────────────────────────────────────────

export interface Employee {
    id: string
    profile_id: string
    employee_code: string | null
    department_id: string | null
    job_title: string | null
    hire_date: string | null
    salary: number
    branch_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface EmployeeWithRefs extends Employee {
    profile?: { full_name: string } | null
    department?: { name: string } | null
    sales_rep?: SalesRep | null
}

export interface EmployeeInput {
    profile_id: string
    employee_code: string | null
    department_id: string | null
    job_title: string | null
    hire_date: string | null
    salary: number
    branch_id: string | null
    is_active: boolean
}

export interface EmployeeFilters {
    page?: number
    pageSize?: number
    search?: string
    department_id?: string
    is_active?: boolean
}

// ── Sales Rep ────────────────────────────────────────────────

export interface SalesRep {
    id: string
    employee_id: string
    rep_type: RepType
    territory: string | null
    vehicle_type: string | null
    max_customers: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface SalesRepInput {
    employee_id: string
    rep_type: RepType
    territory: string | null
    vehicle_type: string | null
    max_customers: number
    is_active: boolean
}

// ── Department Lookup ────────────────────────────────────────

export interface DepartmentLookup {
    id: string
    name: string
}
