import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
    ChevronLeft, ChevronRight, ChevronDown, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { navigationConfig, type NavGroup } from '@/lib/constants/navigation'
import { supabase } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function Sidebar() {
    const { sidebarCollapsed, toggleSidebarCollapse, sidebarOpen, setSidebarOpen } = useUIStore()
    const { can, profile, permissions } = useAuthStore()
    const location = useLocation()
    const [confirmLogout, setConfirmLogout] = useState(false)

    // Track which groups are expanded
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    const roleLabel = permissions.includes('*') ? 'مدير النظام' : 'مستخدم'

    // Filter nav to only visible groups/items
    const visibleGroups = useMemo(() =>
        navigationConfig
            .map(group => ({
                ...group,
                items: group.items.filter(item => !item.permission || can(item.permission)),
            }))
            .filter(group => group.items.length > 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [permissions]
    )

    // Auto-expand the group containing the active route
    useEffect(() => {
        const activeGroup = visibleGroups.find(group =>
            group.items.some(item =>
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href))
            )
        )
        if (activeGroup) {
            setExpandedGroups(prev => {
                const next = new Set(prev)
                next.add(activeGroup.label)
                return next
            })
        }
    }, [location.pathname, visibleGroups])

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(label)) {
                next.delete(label)
            } else {
                next.add(label)
            }
            return next
        })
    }

    const handleLogout = async () => {
        setConfirmLogout(false)
        await supabase.auth.signOut()
    }

    // Check if a group has active item
    const groupHasActive = (group: NavGroup) =>
        group.items.some(item =>
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))
        )

    return (
        <>
            <aside
                className={cn(
                    'sidebar-nav fixed top-16 right-0 z-30 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out flex flex-col',
                    sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
                )}
                style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    borderLeft: '1px solid var(--sidebar-border)',
                }}
            >
                {/* Collapse toggle */}
                <div
                    className={cn(
                        'flex items-center px-3 py-2',
                        sidebarCollapsed ? 'justify-center' : 'justify-end'
                    )}
                    style={{ borderBottom: '1px solid var(--sidebar-divider)' }}
                >
                    <button
                        onClick={toggleSidebarCollapse}
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200"
                        style={{ color: 'var(--sidebar-icon)' }}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg)'
                            e.currentTarget.style.color = 'var(--sidebar-text-hover)'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'var(--sidebar-icon)'
                        }}
                    >
                        {sidebarCollapsed ? (
                            <ChevronLeft className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-2">
                    {visibleGroups.map((group, groupIdx) => {
                        const isExpanded = expandedGroups.has(group.label)
                        const hasActive = groupHasActive(group)
                        // Single-item groups (like 'الرئيسية') show directly without accordion
                        const isSingleItem = group.items.length === 1

                        return (
                            <div key={group.label}>
                                {/* Group separator line */}
                                {groupIdx > 0 && (
                                    <div
                                        className="mx-4 my-1"
                                        style={{ height: '1px', backgroundColor: 'var(--sidebar-divider)' }}
                                    />
                                )}

                                {isSingleItem ? (
                                    /* Single item — render directly */
                                    <div className="px-2 py-0.5">
                                        <SidebarLink
                                            item={group.items[0]!}
                                            pathname={location.pathname}
                                            collapsed={sidebarCollapsed}
                                            onNavigate={() => setSidebarOpen(false)}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Collapsible group header */}
                                        {!sidebarCollapsed ? (
                                            <button
                                                onClick={() => toggleGroup(group.label)}
                                                className="w-full flex items-center gap-2 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 cursor-pointer"
                                                style={{
                                                    color: hasActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-group-label)',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.color = 'var(--sidebar-text-hover)'
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.color = hasActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-group-label)'
                                                }}
                                            >
                                                <ChevronDown
                                                    className={cn(
                                                        'h-3 w-3 shrink-0 transition-transform duration-200',
                                                        !isExpanded && '-rotate-90'
                                                    )}
                                                />
                                                <span>{group.label}</span>
                                                <span
                                                    className="mr-auto text-[9px] font-normal rounded-full px-1.5 py-px"
                                                    style={{
                                                        backgroundColor: 'var(--sidebar-hover-bg)',
                                                        color: 'var(--sidebar-group-label)',
                                                    }}
                                                >
                                                    {group.items.length}
                                                </span>
                                            </button>
                                        ) : (
                                            /* Collapsed mode: thin dotted separator */
                                            <div className="flex justify-center py-1.5">
                                                <div
                                                    className="w-6 rounded-full"
                                                    style={{ height: '2px', backgroundColor: 'var(--sidebar-divider)' }}
                                                    title={group.label}
                                                />
                                            </div>
                                        )}

                                        {/* Group items with smooth expand/collapse */}
                                        <div
                                            className={cn(
                                                'overflow-hidden transition-all duration-200 ease-in-out px-2',
                                                !sidebarCollapsed && !isExpanded && 'max-h-0 opacity-0',
                                                (!sidebarCollapsed && isExpanded) && 'max-h-[800px] opacity-100',
                                                sidebarCollapsed && 'max-h-[800px] opacity-100'
                                            )}
                                        >
                                            <ul className="space-y-0.5 py-0.5">
                                                {group.items.map((item) => (
                                                    <li key={item.href}>
                                                        <SidebarLink
                                                            item={item}
                                                            pathname={location.pathname}
                                                            collapsed={sidebarCollapsed}
                                                            onNavigate={() => setSidebarOpen(false)}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* User Card + Logout */}
                <div className="p-3" style={{ borderTop: '1px solid var(--sidebar-divider)' }}>
                    <div
                        className={cn(
                            'flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200',
                            sidebarCollapsed && 'justify-center px-0'
                        )}
                        style={{ backgroundColor: 'var(--sidebar-user-bg)' }}
                    >
                        {/* Avatar */}
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white shadow-sm">
                            {profile?.full_name?.[0] || 'U'}
                            <span
                                className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 bg-success"
                                style={{ borderColor: 'var(--sidebar-bg)' }}
                            />
                        </div>
                        {!sidebarCollapsed && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="truncate text-sm font-semibold"
                                        style={{ color: 'var(--sidebar-user-text)' }}
                                    >
                                        {profile?.full_name || 'مستخدم'}
                                    </p>
                                    <p
                                        className="text-[10px] truncate"
                                        style={{ color: 'var(--sidebar-user-role)' }}
                                    >
                                        {roleLabel}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfirmLogout(true)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
                                    style={{ color: 'var(--sidebar-icon)' }}
                                    title="تسجيل الخروج"
                                    onMouseEnter={e => {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                                        e.currentTarget.style.color = '#ef4444'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                        e.currentTarget.style.color = 'var(--sidebar-icon)'
                                    }}
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

/* ─── Individual Nav Link ─────────────────────────────────────── */

interface SidebarLinkProps {
    item: { label: string; href: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }
    pathname: string
    collapsed: boolean
    onNavigate: () => void
}

function SidebarLink({ item, pathname, collapsed, onNavigate }: SidebarLinkProps) {
    const isActive =
        pathname === item.href ||
        (item.href !== '/' && pathname.startsWith(item.href))

    return (
        <NavLink
            to={item.href}
            onClick={onNavigate}
            className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                collapsed && 'justify-center px-0'
            )}
            style={{
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
            }}
            title={collapsed ? item.label : undefined}
            onMouseEnter={e => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg)'
                    e.currentTarget.style.color = 'var(--sidebar-text-hover)'
                }
            }}
            onMouseLeave={e => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--sidebar-text)'
                }
            }}
        >
            {/* Active indicator bar */}
            {isActive && (
                <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-l-full"
                    style={{ backgroundColor: 'var(--sidebar-active-border)' }}
                />
            )}
            <item.icon
                className="h-[17px] w-[17px] shrink-0 transition-colors duration-200"
                style={{
                    color: isActive ? 'var(--sidebar-icon-active)' : 'var(--sidebar-icon)',
                }}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
    )
}
