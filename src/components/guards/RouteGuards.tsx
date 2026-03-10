import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Premium loading screen with EDARA branding
 */
function LoadingScreen() {
    return (
        <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--body-bg)' }}>
            <div className="flex flex-col items-center gap-6">
                {/* Animated Logo */}
                <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 shadow-glow">
                        <span className="text-2xl font-bold text-white">E</span>
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-2xl bg-primary-500/20" style={{ animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                        جاري التحميل...
                    </p>
                    {/* Loading bar */}
                    <div className="h-1 w-48 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--card-border)' }}>
                        <div
                            className="h-full rounded-full bg-gradient-to-l from-primary-500 to-primary-600"
                            style={{
                                animation: 'shimmer 1.5s ease-in-out infinite',
                                backgroundSize: '200% 100%',
                                width: '100%',
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Protects dashboard routes — redirects to /login if not authenticated.
 */
export function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuthStore()

    if (isLoading) return <LoadingScreen />
    if (!isAuthenticated) return <Navigate to="/login" replace />

    return <Outlet />
}

/**
 * Redirects authenticated users away from auth pages (e.g., login).
 */
export function GuestRoute() {
    const { isAuthenticated, isLoading } = useAuthStore()

    if (isLoading) return <LoadingScreen />
    if (isAuthenticated) return <Navigate to="/" replace />

    return <Outlet />
}
