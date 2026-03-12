// ============================================================
// EDARA — HR Module Services
// Supabase CRUD for: employees + sales_reps
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    EmployeeWithRefs, EmployeeInput, EmployeeFilters,
    SalesRep, SalesRepInput,
    DepartmentLookup,
} from '@/lib/types/hr'

// ── Employees ────────────────────────────────────────────────

/**
 * Fetch employees with profile, department, and sales_rep joins.
 * Uses RPC for server-side search when available, falls back to client-side.
 */
export async function getEmployees(filters: EmployeeFilters = {}): Promise<{ data: EmployeeWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, department_id, is_active } = filters

    // Try server-side search via RPC
    try {
        const [countResult, searchResult] = await Promise.all([
            supabase.rpc('count_employees', {
                p_search: search || null,
                p_department_id: department_id || null,
                p_is_active: is_active ?? null,
            }),
            supabase.rpc('search_employees', {
                p_search: search || null,
                p_department_id: department_id || null,
                p_is_active: is_active ?? null,
                p_offset: (page - 1) * pageSize,
                p_limit: pageSize,
            }),
        ])

        if (!searchResult.error && !countResult.error) {
            const total = (countResult.data as number) || 0
            const rows = (searchResult.data || []) as Array<{
                id: string; profile_id: string; employee_code: string | null;
                department_id: string | null; job_title: string | null;
                hire_date: string | null; salary: number; is_active: boolean;
                created_at: string; updated_at: string;
                full_name: string | null; department_name: string | null;
            }>

            // Fetch sales_reps for these employees
            const employeeIds = rows.map(e => e.id)
            let repsMap: Record<string, SalesRep> = {}
            if (employeeIds.length > 0) {
                const { data: reps } = await supabase
                    .from('sales_reps')
                    .select('*')
                    .in('employee_id', employeeIds)
                for (const rep of (reps || []) as SalesRep[]) {
                    repsMap[rep.employee_id] = rep
                }
            }

            const result: EmployeeWithRefs[] = rows.map(r => ({
                id: r.id,
                profile_id: r.profile_id,
                employee_code: r.employee_code,
                department_id: r.department_id,
                job_title: r.job_title,
                hire_date: r.hire_date,
                salary: r.salary,
                is_active: r.is_active,
                created_at: r.created_at,
                updated_at: r.updated_at,
                profile: r.full_name ? { full_name: r.full_name } : null,
                department: r.department_name ? { name: r.department_name } : null,
                sales_rep: repsMap[r.id] || null,
            }))

            return { data: result, total }
        }
    } catch {
        // Fallback to original approach if RPC not available
    }

    // Fallback: original two-step approach
    let countQuery = supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })

    if (department_id) countQuery = countQuery.eq('department_id', department_id)
    if (is_active !== undefined) countQuery = countQuery.eq('is_active', is_active)

    const { count } = await countQuery
    const total = count || 0

    let query = supabase
        .from('employees')
        .select(`
            *,
            profile:profiles!profile_id ( full_name ),
            department:departments!department_id ( name )
        `)

    if (department_id) query = query.eq('department_id', department_id)
    if (is_active !== undefined) query = query.eq('is_active', is_active)

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data: employees, error } = await query
    if (error) throw error

    if (!employees || employees.length === 0) return { data: [], total }

    const employeeIds = employees.map(e => e.id)
    const { data: reps } = await supabase
        .from('sales_reps')
        .select('*')
        .in('employee_id', employeeIds)

    const repsMap: Record<string, SalesRep> = {}
    for (const rep of (reps || []) as SalesRep[]) {
        repsMap[rep.employee_id] = rep
    }

    let result: EmployeeWithRefs[] = employees.map(e => ({
        ...e,
        sales_rep: repsMap[e.id] || null,
    })) as unknown as EmployeeWithRefs[]

    // Client-side search fallback
    if (search) {
        const s = search.toLowerCase()
        result = result.filter(e =>
            e.profile?.full_name?.toLowerCase().includes(s) ||
            e.employee_code?.toLowerCase().includes(s) ||
            e.job_title?.toLowerCase().includes(s)
        )
    }

    return { data: result, total }
}

export async function getEmployee(id: string): Promise<EmployeeWithRefs | null> {
    const { data, error } = await supabase
        .from('employees')
        .select(`
            *,
            profile:profiles!profile_id ( full_name ),
            department:departments!department_id ( name )
        `)
        .eq('id', id)
        .single()

    if (error) throw error

    // Fetch sales_rep if exists
    const { data: rep } = await supabase
        .from('sales_reps')
        .select('*')
        .eq('employee_id', id)
        .maybeSingle()

    return { ...data, sales_rep: (rep as SalesRep) || null } as unknown as EmployeeWithRefs
}

/**
 * Create employee, and if isSalesRep, also create sales_rep record.
 */
export async function createEmployee(
    input: Partial<EmployeeInput>,
    repInput?: Partial<SalesRepInput>,
): Promise<EmployeeWithRefs> {
    const { data, error } = await supabase
        .from('employees')
        .insert(input)
        .select(`
            *,
            profile:profiles!profile_id ( full_name ),
            department:departments!department_id ( name )
        `)
        .single()

    if (error) throw error

    let salesRep: SalesRep | null = null

    if (repInput) {
        const { data: rep, error: repError } = await supabase
            .from('sales_reps')
            .insert({ ...repInput, employee_id: data.id })
            .select()
            .single()

        if (repError) throw repError
        salesRep = rep as SalesRep
    }

    return { ...data, sales_rep: salesRep } as unknown as EmployeeWithRefs
}

/**
 * Update employee, and upsert/delete sales_rep if toggled.
 */
export async function updateEmployee(
    id: string,
    input: Partial<EmployeeInput>,
    repInput?: Partial<SalesRepInput> | null,
): Promise<EmployeeWithRefs> {
    const { data, error } = await supabase
        .from('employees')
        .update(input)
        .eq('id', id)
        .select(`
            *,
            profile:profiles!profile_id ( full_name ),
            department:departments!department_id ( name )
        `)
        .single()

    if (error) throw error

    let salesRep: SalesRep | null = null

    // Check if a sales_rep record exists
    const { data: existingRep } = await supabase
        .from('sales_reps')
        .select('id')
        .eq('employee_id', id)
        .maybeSingle()

    if (repInput) {
        if (existingRep) {
            // Update existing
            const { data: rep, error: repError } = await supabase
                .from('sales_reps')
                .update({ ...repInput })
                .eq('employee_id', id)
                .select()
                .single()

            if (repError) throw repError
            salesRep = rep as SalesRep
        } else {
            // Insert new
            const { data: rep, error: repError } = await supabase
                .from('sales_reps')
                .insert({ ...repInput, employee_id: id })
                .select()
                .single()

            if (repError) throw repError
            salesRep = rep as SalesRep
        }
    } else if (existingRep) {
        // Toggle off: delete the sales_rep record
        await supabase.from('sales_reps').delete().eq('employee_id', id)
    }

    return { ...data, sales_rep: salesRep } as unknown as EmployeeWithRefs
}

export async function deleteEmployee(id: string): Promise<void> {
    // sales_reps has CASCADE on employee_id
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Department Lookups ───────────────────────────────────────

export async function getDepartmentLookups(): Promise<DepartmentLookup[]> {
    const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')

    if (error) throw error
    return (data || []) as DepartmentLookup[]
}

// ── Assigned Customers for a Rep (by profile_id) ─────────────

export interface AssignedCustomerSummary {
    id: string
    name: string
    code: string | null
    classification: string
    phone: string | null
    is_active: boolean
}

/**
 * Fetch customers assigned to a specific profile (rep).
 * Used in EmployeeDetailPage to show the rep's customer portfolio.
 */
export async function getAssignedCustomersForRep(profileId: string): Promise<AssignedCustomerSummary[]> {
    const { data, error } = await supabase
        .from('customers')
        .select('id, name, code, classification, phone, is_active')
        .eq('assigned_rep_id', profileId)
        .order('name')

    if (error) throw error
    return (data || []) as AssignedCustomerSummary[]
}

// ── Employee Count by Department ─────────────────────────────

export async function getEmployeeCountByDepartment(): Promise<Record<string, number>> {
    const { data, error } = await supabase
        .from('employees')
        .select('department_id')
        .eq('is_active', true)

    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data || []) {
        if (row.department_id) {
            counts[row.department_id] = (counts[row.department_id] || 0) + 1
        }
    }
    return counts
}
