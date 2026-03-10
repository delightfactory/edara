import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function DashboardLayout() {
    const { sidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore()

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--body-bg)' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-surface-950/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — on mobile: hidden by CSS; shown via .sidebar-mobile-drawer wrapper */}
            {sidebarOpen && (
                <div className="sidebar-mobile-drawer lg:hidden">
                    <Sidebar />
                </div>
            )}
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div
                className={cn(
                    'flex flex-1 flex-col min-w-0 h-screen overflow-y-auto transition-all duration-300',
                    // Desktop margin based on sidebar state
                    sidebarCollapsed ? 'lg:mr-[72px]' : 'lg:mr-[264px]',
                    // Mobile: no margin
                    'mr-0'
                )}
            >
                <Header />

                <main className="flex-1 p-4 sm:p-6">
                    <div className="mx-auto max-w-7xl animate-[fade-in_0.3s_ease-out]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
