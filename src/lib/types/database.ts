/* eslint-disable @typescript-eslint/no-empty-object-type */

/**
 * Database type definitions.
 * This file will be expanded as we build each module's migration.
 * For now, it defines the base foundation tables.
 */
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    avatar_url: string | null
                    phone: string | null
                    department_id: string | null
                    is_active: boolean
                    last_login_at: string | null
                    metadata: Record<string, unknown> | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    phone?: string | null
                    department_id?: string | null
                    is_active?: boolean
                    metadata?: Record<string, unknown> | null
                }
                Update: {
                    full_name?: string | null
                    avatar_url?: string | null
                    phone?: string | null
                    department_id?: string | null
                    is_active?: boolean
                    metadata?: Record<string, unknown> | null
                }
            }
            roles: {
                Row: {
                    id: string
                    name: string
                    display_name: string
                    description: string | null
                    parent_role_id: string | null
                    is_system: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    name: string
                    display_name: string
                    description?: string | null
                    parent_role_id?: string | null
                    is_system?: boolean
                }
                Update: {
                    name?: string
                    display_name?: string
                    description?: string | null
                    parent_role_id?: string | null
                }
            }
            permissions: {
                Row: {
                    id: string
                    module: string
                    entity: string
                    action: string
                    display_name: string
                    created_at: string
                }
                Insert: {
                    module: string
                    entity: string
                    action: string
                    display_name: string
                }
                Update: {
                    display_name?: string
                }
            }
            role_permissions: {
                Row: {
                    id: string
                    role_id: string
                    permission_id: string
                    conditions: Record<string, unknown> | null
                    created_at: string
                }
                Insert: {
                    role_id: string
                    permission_id: string
                    conditions?: Record<string, unknown> | null
                }
                Update: {
                    conditions?: Record<string, unknown> | null
                }
            }
            user_roles: {
                Row: {
                    id: string
                    user_id: string
                    role_id: string
                    assigned_by: string | null
                    expires_at: string | null
                    created_at: string
                }
                Insert: {
                    user_id: string
                    role_id: string
                    assigned_by?: string | null
                    expires_at?: string | null
                }
                Update: {
                    expires_at?: string | null
                }
            }
            departments: {
                Row: {
                    id: string
                    name: string
                    parent_id: string | null
                    manager_id: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    name: string
                    parent_id?: string | null
                    manager_id?: string | null
                }
                Update: {
                    name?: string
                    parent_id?: string | null
                    manager_id?: string | null
                    is_active?: boolean
                }
            }
            audit_log: {
                Row: {
                    id: string
                    table_name: string
                    record_id: string
                    action: string
                    old_data: Record<string, unknown> | null
                    new_data: Record<string, unknown> | null
                    user_id: string | null
                    ip_address: string | null
                    created_at: string
                }
                Insert: {
                    table_name: string
                    record_id: string
                    action: string
                    old_data?: Record<string, unknown> | null
                    new_data?: Record<string, unknown> | null
                    user_id?: string | null
                    ip_address?: string | null
                }
                Update: {}
            }
            company_settings: {
                Row: {
                    id: string
                    key: string
                    value: string
                    category: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    key: string
                    value: string
                    category?: string
                }
                Update: {
                    value?: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    message: string
                    type: 'info' | 'warning' | 'error' | 'success'
                    is_read: boolean
                    link: string | null
                    created_at: string
                }
                Insert: {
                    user_id: string
                    title: string
                    message: string
                    type?: 'info' | 'warning' | 'error' | 'success'
                    link?: string | null
                }
                Update: {
                    is_read?: boolean
                }
            }
        }
        Functions: {
            get_user_permissions: {
                Args: { p_user_id: string }
                Returns: string[]
            }
            check_permission: {
                Args: { p_user_id: string; p_permission: string }
                Returns: boolean
            }
        }
        Enums: {}
    }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type Permission = Database['public']['Tables']['permissions']['Row']
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
