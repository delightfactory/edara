import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/lib/types/database'

interface AuthProviderProps {
    children: React.ReactNode
}

/**
 * Loads profile + permissions for a user.
 * Runs OUTSIDE the onAuthStateChange callback to avoid blocking.
 */
async function loadUserData(
    userId: string,
    setProfile: (p: Profile | null) => void,
    setPermissions: (p: string[]) => void,
    setLoading: (l: boolean) => void
) {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (profileError) {
            console.error('[Auth] Profile error:', profileError.message)
        } else if (profile) {
            setProfile(profile)
        }

        const { data: permissions, error: permError } = await supabase.rpc(
            'get_user_permissions',
            { p_user_id: userId }
        )

        if (permError) {
            console.error('[Auth] Permissions error:', permError.message)
        } else if (permissions) {
            setPermissions(permissions as string[])
        }
    } catch (error) {
        console.error('[Auth] loadUserData error:', error)
    } finally {
        setLoading(false)
    }
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setAuth, setProfile, setPermissions, setLoading, reset } = useAuthStore()

    useEffect(() => {
        // Supabase v2: onAuthStateChange fires INITIAL_SESSION immediately.
        // CRITICAL: Do NOT await async operations inside the callback —
        // Supabase serializes auth events and will deadlock if the callback
        // returns a long-running Promise. Instead, schedule async work
        // outside the callback using setTimeout(..., 0).
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth] Event:', event, session?.user?.email ?? 'no user')

            if (session?.user) {
                setAuth(session.user, session)

                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                    // Schedule data loading outside the synchronous callback
                    const userId = session.user.id
                    setTimeout(() => {
                        loadUserData(userId, setProfile, setPermissions, setLoading)
                    }, 0)
                } else {
                    // TOKEN_REFRESHED etc. — just update auth, no need to reload data
                    setLoading(false)
                }
            } else {
                // No session
                reset()
                setLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <>{children}</>
}
