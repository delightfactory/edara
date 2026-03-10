import { supabase } from '@/lib/supabase/client'
import type { Department, Notification } from '@/lib/types/database'

// ============================================================
// Departments
// ============================================================

export async function getDepartments() {
    const { data, error } = await supabase
        .from('departments')
        .select('*, manager:manager_id(id, full_name)')
        .order('name')

    if (error) throw error
    return data as (Department & { manager: { id: string; full_name: string } | null })[]
}

export async function createDepartment(dept: { name: string; parent_id?: string; manager_id?: string }) {
    const { data, error } = await supabase
        .from('departments')
        .insert(dept)
        .select()
        .single()

    if (error) throw error
    return data as Department
}

export async function updateDepartment(id: string, updates: Partial<Department>) {
    const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Department
}

export async function deleteDepartment(id: string) {
    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Company Settings
// ============================================================

export interface CompanySetting {
    id: string
    key: string
    value: string
    category: string
    created_at: string
    updated_at: string
}

export async function getCompanySettings() {
    const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .order('category')
        .order('key')

    if (error) throw error
    return data as CompanySetting[]
}

export async function updateCompanySetting(key: string, value: string) {
    const { data, error } = await supabase
        .from('company_settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single()

    if (error) throw error
    return data as CompanySetting
}

// ============================================================
// Audit Log
// ============================================================

export async function getAuditLogs({
    page = 1,
    pageSize = 25,
    tableName,
    action,
}: {
    page?: number
    pageSize?: number
    tableName?: string
    action?: string
} = {}) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (tableName) query = query.eq('table_name', tableName)
    if (action) query = query.eq('action', action)

    const { data, error, count } = await query

    if (error) throw error
    return {
        data: data as {
            id: string
            table_name: string
            record_id: string
            action: string
            old_data: Record<string, unknown> | null
            new_data: Record<string, unknown> | null
            user_id: string | null
            ip_address: string | null
            created_at: string
        }[],
        total: count || 0,
    }
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) throw error
    return data as Notification[]
}

export async function getUnreadCount() {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

    if (error) throw error
    return count || 0
}

export async function markAsRead(notificationId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

    if (error) throw error
}

export async function markAllAsRead() {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)

    if (error) throw error
}
