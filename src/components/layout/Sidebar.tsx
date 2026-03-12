import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
    ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { navigationConfig } from '@/lib/constants/navigation'
import { supabase } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function Sidebar() {
    const { sidebarCollapsed, toggleSidebarCollapse, sidebarOpen, setSidebarOpen } = useUIStore()
    const { can, profile, permissions } = useAuthStore()
    const location = useLocation()
    const [confirmLogout, setConfirmLogout] = useState(false)

    // Derive role label from permissions
    const roleLabel = permissions.includes('*') ? 'مدير النظام' : 'مستخدم'

    const handleLogout = async () => {
        setConfirmLogout(false)
        await supabase.auth.signOut()
    }

    return (
        <>
            <aside
                className={cn(
                    'sidebar-nav fixed top-16 right-0 z-30 h-[calc(100vh-4rem)] bg-sidebar-bg transition-all duration-300 ease-in-out flex flex-col',
                    sidebarCollapsed ? 'w-[72px]' : 'w-[264px]'
                )}
            >
                {/* Collapse toggle */}
                <div className={cn(
                    'flex items-center border-b border-white/5 px-3 py-2',
                    sidebarCollapsed ? 'justify-center' : 'justify-end'
                )}>
                    <button
                        onClick={toggleSidebarCollapse}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-text/60 hover:bg-white/5 hover:text-white transition-all duration-200"
                    >
                        {sidebarCollapsed ? (
                            <ChevronLeft className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                    {navigationConfig.map((group) => {
                        const visibleItems = group.items.filter(
                            (item) => !item.permission || can(item.permission)
                        )
                        if (visibleItems.length === 0) return null

                        return (
                            <div key={group.label}>
                                {!sidebarCollapsed && (
                                    <p className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-text/40">
                                        {group.label}
                                    </p>
                                )}
                                <ul className="space-y-0.5">
                                    {visibleItems.map((item) => {
                                        const isActive =
                                            location.pathname === item.href ||
                                            (item.href !== '/' && location.pathname.startsWith(item.href))

                                        return (
                                            <li key={item.href}>
                                                <NavLink
                                                    to={item.href}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={cn(
                                                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                                                        isActive
                                                            ? 'bg-sidebar-active text-white shadow-sm'
                                                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                                                        sidebarCollapsed && 'justify-center px-0'
                                                    )}
                                                    title={sidebarCollapsed ? item.label : undefined}
                                                >
                                                    {/* Active indicator */}
                                                    {isActive && (
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-l-full bg-primary-400" />
                                                    )}
                                                    <item.icon className={cn(
                                                        'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                                                        isActive ? 'text-primary-300' : 'text-sidebar-text/60 group-hover:text-white/80'
                                                    )} />
                                                    {!sidebarCollapsed && <span>{item.label}</span>}
                                                </NavLink>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )
                    })}
                </nav>

                {/* User Card + Logout */}
                <div className="border-t border-white/5 p-3">
                    <div
                        className={cn(
                            'flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/5 transition-all duration-200',
                            sidebarCollapsed && 'justify-center px-0'
                        )}
                    >
                        {/* Avatar */}
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white shadow-sm">
                            {profile?.full_name?.[0] || 'U'}
                            {/* Online indicator */}
                            <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-sidebar-bg bg-success" />
                        </div>
                        {!sidebarCollapsed && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                        {profile?.full_name || 'مستخدم'}
                                    </p>
                                    <p className="text-[10px] text-sidebar-text/50 truncate">
                                        {roleLabel}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfirmLogout(true)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-text/50 hover:bg-danger/10 hover:text-danger transition-all duration-200"
                                    title="تسجيل الخروج"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Logout Confirm */}
            <ConfirmDialog open={confirmLogout} variant="warning" title="تسجيل الخروج" message="هل أنت متأكد من تسجيل الخروج؟"
                confirmLabel="خروج" onConfirm={handleLogout} onCancel={() => setConfirmLogout(false)} />
        </>
    )
}
