import { supabase } from '@/lib/supabase/client'
import type { Profile, Role, Permission, UserRole } from '@/lib/types/database'

// ============================================================
// Auth Service
// ============================================================

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

// ============================================================
// Profiles
// ============================================================

export async function getProfiles({ search }: { search?: string } = {}) {
    let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Profile[]
}

export async function getProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw error
    return data as Profile
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) throw error
    return data as Profile
}

// ============================================================
// Roles
// ============================================================

export async function getRoles() {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('display_name')

    if (error) throw error
    return data as Role[]
}

export async function getRole(roleId: string) {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

    if (error) throw error
    return data as Role
}

export async function createRole(role: { name: string; display_name: string; description?: string; parent_role_id?: string }) {
    const { data, error } = await supabase
        .from('roles')
        .insert(role)
        .select()
        .single()

    if (error) throw error
    return data as Role
}

export async function updateRole(roleId: string, updates: Partial<Role>) {
    const { data, error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', roleId)
        .select()
        .single()

    if (error) throw error
    return data as Role
}

export async function deleteRole(roleId: string) {
    const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

    if (error) throw error
}

// ============================================================
// Permissions
// ============================================================

export async function getPermissions() {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
        .order('entity')
        .order('action')

    if (error) throw error
    return data as Permission[]
}

export async function getRolePermissions(roleId: string) {
    const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)

    if (error) throw error
    return (data as Array<{ permission_id: string }>).map((rp) => rp.permission_id)
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
    // Delete existing
    const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

    if (deleteError) throw deleteError

    // Insert new
    if (permissionIds.length > 0) {
        const rows = permissionIds.map((pid) => ({
            role_id: roleId,
            permission_id: pid,
        }))

        const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(rows)

        if (insertError) throw insertError
    }
}

// ============================================================
// User-Role assignments
// ============================================================

export async function getUserRoles(userId: string) {
    const { data, error } = await supabase
        .from('user_roles')
        .select('*, roles:role_id(id, name, display_name)')
        .eq('user_id', userId)

    if (error) throw error
    return data as (UserRole & { roles: Pick<Role, 'id' | 'name' | 'display_name'> })[]
}

export async function assignRole(userId: string, roleId: string) {
    const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role_id: roleId })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function removeUserRole(userRoleId: string) {
    const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId)

    if (error) throw error
}

// ============================================================
// User Management (via Edge Function)
// ============================================================

/**
 * Create a new user via Supabase Edge Function.
 * This is needed because admin user creation requires the service_role key
 * which should never be exposed to the client.
 */
export async function createUser(userData: {
    email: string
    password: string
    full_name: string
    phone?: string
    role_id?: string
}) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', ...userData },
    })

    if (error) throw error
    if (data.error) throw new Error(data.error)
    return data.user
}

/**
 * Update user via Edge Function (e.g. reset password, toggle active).
 */
export async function adminUpdateUser(userId: string, updates: {
    email?: string
    password?: string
    is_active?: boolean
    full_name?: string
    phone?: string
}) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update', user_id: userId, ...updates },
    })

    if (error) throw error
    if (data.error) throw new Error(data.error)
    return data.user
}

/**
 * Delete a user via Edge Function.
 */
export async function deleteUser(userId: string) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: userId },
    })

    if (error) throw error
    if (data.error) throw new Error(data.error)
    return data
}
