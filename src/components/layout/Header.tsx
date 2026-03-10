import { Bell, Moon, Sun, Menu, Settings, X, Check, CheckCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/services/settings'
import type { Notification } from '@/lib/types/database'

export function Header() {
    const { theme, toggleTheme, toggleSidebar } = useUIStore()
    const { profile } = useAuthStore()
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('EDARA')
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loadingNotifications, setLoadingNotifications] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Load company name
    useEffect(() => {
        getCompanySettings().then(settings => {
            const name = settings.find(s => s.key === 'company_name')
            if (name?.value) setCompanyName(name.value)
        }).catch(() => { /* keep default */ })
    }, [])

    // Load unread count + poll every 60s
    useEffect(() => {
        const loadCount = () => {
            getUnreadCount().then(setUnreadCount).catch(() => { /* ignore */ })
        }
        loadCount()
        const interval = setInterval(loadCount, 60000)
        return () => clearInterval(interval)
    }, [])

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleToggleNotifications = async () => {
        const next = !showNotifications
        setShowNotifications(next)
        if (next && notifications.length === 0) {
            setLoadingNotifications(true)
            try {
                const data = await getNotifications()
                setNotifications(data)
            } catch { /* ignore */ }
            setLoadingNotifications(false)
        }
    }

    const handleMarkAsRead = async (id: string) => {
        try {
            await markAsRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch { /* ignore */ }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead()
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        } catch { /* ignore */ }
    }

    const formatTimeAgo = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return 'الآن'
        if (minutes < 60) return `منذ ${minutes} دقيقة`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `منذ ${hours} ساعة`
        const days = Math.floor(hours / 24)
        return `منذ ${days} يوم`
    }

    const notifTypeColors: Record<string, string> = {
        info: 'bg-primary-500',
        success: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-danger',
    }

    return (
        <header
            className="sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 sm:px-6 backdrop-blur-xl transition-all duration-300"
            style={{
                backgroundColor: 'var(--header-bg)',
                borderColor: 'var(--header-border)',
            }}
        >
            {/* Right side */}
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleSidebar}
                    className="btn-ghost lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div>
                    <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {companyName}
                    </h2>
                    <p className="text-[11px] mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                        نظام إدارة المبيعات
                    </p>
                </div>
            </div>

            {/* Left side */}
            <div className="flex items-center gap-1.5">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="btn-ghost btn-icon rounded-xl"
                    title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
                >
                    {theme === 'light' ? (
                        <Moon className="h-[18px] w-[18px]" />
                    ) : (
                        <Sun className="h-[18px] w-[18px]" />
                    )}
                </button>

                {/* Notifications */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={handleToggleNotifications}
                        className="btn-ghost btn-icon rounded-xl relative"
                        title="الإشعارات"
                    >
                        <Bell className="h-[18px] w-[18px]" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div
                            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border shadow-2xl overflow-hidden animate-[fade-in_0.15s_ease-out] z-50"
                            style={{
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--card-border)',
                            }}
                        >
                            {/* Dropdown header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--divider-color)' }}>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    الإشعارات
                                </h3>
                                <div className="flex items-center gap-1">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="btn-ghost text-[10px] px-2 py-1 rounded-lg flex items-center gap-1"
                                            title="قراءة الكل"
                                        >
                                            <CheckCheck className="h-3 w-3" />
                                            قراءة الكل
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowNotifications(false)}
                                        className="btn-ghost btn-icon rounded-lg p-1"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown body */}
                            <div className="max-h-80 overflow-y-auto">
                                {loadingNotifications ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                                        <Bell className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            لا توجد إشعارات
                                        </p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                                            style={{
                                                borderBottom: '1px solid var(--divider-color)',
                                                backgroundColor: notif.is_read ? 'transparent' : 'var(--empty-bg)',
                                            }}
                                            onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                                        >
                                            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notifTypeColors[notif.type] || 'bg-primary-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                                    {notif.message}
                                                </p>
                                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {formatTimeAgo(notif.created_at)}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id) }}
                                                    className="btn-ghost p-1 rounded-lg mt-1 shrink-0"
                                                    title="تعيين كمقروء"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <button
                    onClick={() => navigate('/settings')}
                    className="btn-ghost btn-icon rounded-xl hidden sm:flex"
                    title="الإعدادات"
                >
                    <Settings className="h-[18px] w-[18px]" />
                </button>

                <div className="h-8 w-px mx-1.5" style={{ backgroundColor: 'var(--divider-color)' }} />

                {/* User avatar */}
                <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 cursor-pointer transition-colors"
                    style={{ color: 'var(--text-primary)' }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white shadow-sm">
                        {profile?.full_name?.[0] || 'U'}
                    </div>
                    <div className="hidden lg:block">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {profile?.full_name || 'مستخدم'}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    )
}
