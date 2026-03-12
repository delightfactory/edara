import {
    Package, Users, Warehouse, UserCircle2,
    TrendingUp, Clock, Activity,
    AlertTriangle, BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { getCompanySettings } from '@/lib/services/settings'
import { getDashboardStats, getRecentActivity } from '@/lib/services/dashboard'
import type { DashboardStats, RecentActivity } from '@/lib/services/dashboard'

const ACTION_LABELS: Record<string, string> = {
    INSERT: 'إضافة',
    UPDATE: 'تعديل',
    DELETE: 'حذف',
}

const TABLE_LABELS: Record<string, string> = {
    products: 'المنتجات',
    customers: 'العملاء',
    suppliers: 'الموردين',
    warehouses: 'المستودعات',
    employees: 'الموظفين',
    categories: 'التصنيفات',
    brands: 'العلامات التجارية',
    units: 'الوحدات',
    price_lists: 'قوائم الأسعار',
    roles: 'الأدوار',
    departments: 'الأقسام',
    profiles: 'المستخدمين',
    company_settings: 'الإعدادات',
    stock: 'المخزون',
    stock_movements: 'حركات المخزون',
    shipping_companies: 'شركات الشحن',
    sales_reps: 'المناديب',
}

export function DashboardPage() {
    usePageTitle('لوحة القيادة')
    const { profile } = useAuthStore()
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('الشركة')
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [activities, setActivities] = useState<RecentActivity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const name = settings.find(s => s.key === 'company_name')
            if (name?.value) setCompanyName(name.value)
        }).catch(() => { })

        Promise.all([
            getDashboardStats(),
            getRecentActivity(8),
        ]).then(([s, a]) => {
            setStats(s)
            setActivities(a)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير'

    const formatNumber = (val: number) =>
        new Intl.NumberFormat('ar-EG').format(val)

    const formatTimeAgo = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'الآن'
        if (mins < 60) return `منذ ${mins} د`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `منذ ${hrs} س`
        const days = Math.floor(hrs / 24)
        return `منذ ${days} ي`
    }

    const statCards = [
        {
            label: 'المنتجات النشطة',
            value: stats ? formatNumber(stats.totalProducts) : '—',
            icon: Package,
            iconBg: 'bg-primary-100 dark:bg-primary-900/40',
            iconColor: 'text-primary-600 dark:text-primary-300',
            gradient: 'from-primary-500 to-primary-600',
            href: '/products',
        },
        {
            label: 'العملاء النشطين',
            value: stats ? formatNumber(stats.activeCustomers) : '—',
            icon: Users,
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconColor: 'text-emerald-600 dark:text-emerald-300',
            gradient: 'from-emerald-500 to-emerald-600',
            href: '/crm/customers',
        },
        {
            label: 'المستودعات',
            value: stats ? formatNumber(stats.totalWarehouses) : '—',
            icon: Warehouse,
            iconBg: 'bg-accent-100 dark:bg-accent-900/40',
            iconColor: 'text-accent-600 dark:text-accent-300',
            gradient: 'from-accent-500 to-accent-600',
            href: '/inventory/warehouses',
        },
        {
            label: 'الموظفين',
            value: stats ? formatNumber(stats.activeEmployees) : '—',
            icon: UserCircle2,
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            iconColor: 'text-amber-600 dark:text-amber-300',
            gradient: 'from-amber-500 to-amber-600',
            href: '/hr/employees',
        },
    ]

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary-600 via-primary-700 to-primary-800 p-6 text-white shadow-lg shadow-primary-900/10">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                    backgroundSize: '24px 24px',
                }} />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold mb-1">
                            {greeting}، {profile?.full_name || 'مستخدم'} 👋
                        </h1>
                        <p className="text-primary-200 text-sm">
                            إليك نظرة عامة على بيانات {companyName}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm self-start sm:self-auto">
                        <Clock className="h-4 w-4 text-primary-200" />
                        <span className="text-primary-100 text-xs sm:text-sm">
                            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="edara-card group relative p-4 sm:p-5 cursor-pointer"
                        style={{ animationDelay: `${index * 80}ms`, animation: 'fade-in 0.4s ease-out backwards' }}
                        onClick={() => navigate(stat.href)}
                    >
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                            </div>
                        </div>
                        <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            {stat.label}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            {loading ? <span className="skeleton inline-block h-7 w-12 rounded" /> : stat.value}
                        </p>
                        <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-l ${stat.gradient} opacity-0 transition-all duration-300 group-hover:opacity-100`} />
                    </div>
                ))}
            </div>

            {/* Low Stock Alert */}
            {stats && stats.lowStockCount > 0 && (
                <div className="edara-card p-4 sm:p-5 flex items-center gap-3 cursor-pointer transition-colors edara-tr-hover"
                    style={{ borderRightWidth: '4px', borderRightColor: 'var(--color-danger)' }}
                    onClick={() => navigate('/inventory/stock')}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            تنبيه: {formatNumber(stats.lowStockCount)} منتج تحت الحد الأدنى
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            راجع أرصدة المخزون واتخذ إجراء التوريد اللازم
                        </p>
                    </div>
                </div>
            )}

            {/* Charts + Activity Grid */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Main Chart Placeholder */}
                <div className="edara-card p-5 sm:p-6 lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
                                <TrendingUp className="h-4.5 w-4.5 text-primary-600 dark:text-primary-300" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    المبيعات الشهرية
                                </h3>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>سيتم التفعيل مع وحدة المبيعات</p>
                            </div>
                        </div>
                    </div>
                    <div className="edara-empty flex h-48 sm:h-64 items-center justify-center">
                        <div className="text-center">
                            <BarChart3 className="mx-auto mb-2 h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                سيتم عرض الرسم البياني بعد تفعيل وحدة المبيعات
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="edara-card p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900/40">
                            <Activity className="h-4.5 w-4.5 text-accent-600 dark:text-accent-300" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                أحدث العمليات
                            </h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>من سجل التدقيق</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="skeleton h-8 w-8 rounded-lg shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="skeleton h-3 w-3/4 rounded" />
                                        <div className="skeleton h-2.5 w-1/2 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="edara-empty flex h-48 sm:h-64 items-center justify-center">
                            <div className="text-center">
                                <Clock className="mx-auto mb-2 h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    لا توجد عمليات حتى الآن
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {activities.map((act, i) => (
                                <div key={act.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors edara-tr-hover"
                                    style={{ animation: `fade-in 0.3s ease-out ${i * 50}ms backwards` }}>
                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-[9px] font-bold ${act.action === 'INSERT' ? 'bg-emerald-500' : act.action === 'DELETE' ? 'bg-red-500' : 'bg-primary-500'}`}>
                                        {ACTION_LABELS[act.action]?.charAt(0) || '؟'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                            {ACTION_LABELS[act.action] || act.action} — {TABLE_LABELS[act.table_name] || act.table_name}
                                        </p>
                                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {act.user_name || 'النظام'} · {formatTimeAgo(act.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
