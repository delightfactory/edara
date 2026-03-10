import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/database'

interface AuthState {
    user: User | null
    session: Session | null
    profile: Profile | null
    permissions: string[]
    isLoading: boolean
    isAuthenticated: boolean

    // Actions
    setAuth: (user: User | null, session: Session | null) => void
    setProfile: (profile: Profile | null) => void
    setPermissions: (permissions: string[]) => void
    setLoading: (loading: boolean) => void
    reset: () => void

    // Permission helpers
    can: (permission: string) => boolean
    canAny: (permissions: string[]) => boolean
    canAll: (permissions: string[]) => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            profile: null,
            permissions: [],
            isLoading: true,
            isAuthenticated: false,

            setAuth: (user, session) =>
                set({
                    user,
                    session,
                    isAuthenticated: !!user && !!session,
                }),

            setProfile: (profile) => set({ profile }),

            setPermissions: (permissions) => set({ permissions }),

            setLoading: (isLoading) => set({ isLoading }),

            reset: () =>
                set({
                    user: null,
                    session: null,
                    profile: null,
                    permissions: [],
                    isAuthenticated: false,
                    isLoading: false,
                }),

            can: (permission) => {
                const { permissions } = get()
                // Super admin has all permissions
                if (permissions.includes('*')) return true
                return permissions.includes(permission)
            },

            canAny: (perms) => {
                const { can } = get()
                return perms.some((p) => can(p))
            },

            canAll: (perms) => {
                const { can } = get()
                return perms.every((p) => can(p))
            },
        }),
        {
            name: 'edara-auth',
            partialize: (state) => ({
                // Only persist non-sensitive data
                permissions: state.permissions,
            }),
        }
    )
)
