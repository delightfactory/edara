import {
    BarChart3, Users, ShoppingCart, DollarSign,
    TrendingUp, ArrowUpLeft, Clock, Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'

export function DashboardPage() {
    const { profile } = useAuthStore()
    const [companyName, setCompanyName] = useState('الشركة')

    useEffect(() => {
        getCompanySettings().then(settings => {
            const name = settings.find(s => s.key === 'company_name')
            if (name?.value) setCompanyName(name.value)
        }).catch(() => { /* keep default */ })
    }, [])

    const stats = [
        {
            label: 'إجمالي المبيعات',
            value: '—',
            change: '+0%',
            icon: ShoppingCart,
            gradient: 'from-primary-500 to-primary-600',
            iconBg: 'bg-primary-100 dark:bg-primary-900/40',
            iconColor: 'text-primary-600 dark:text-primary-300',
        },
        {
            label: 'التحصيل',
            value: '—',
            change: '+0%',
            icon: DollarSign,
            gradient: 'from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconColor: 'text-emerald-600 dark:text-emerald-300',
        },
        {
            label: 'العملاء النشطين',
            value: '—',
            change: '+0%',
            icon: Users,
            gradient: 'from-accent-500 to-accent-600',
            iconBg: 'bg-accent-100 dark:bg-accent-900/40',
            iconColor: 'text-accent-600 dark:text-accent-300',
        },
        {
            label: 'الفواتير اليوم',
            value: '—',
            change: '+0%',
            icon: BarChart3,
            gradient: 'from-amber-500 to-amber-600',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            iconColor: 'text-amber-600 dark:text-amber-300',
        },
    ]

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير'

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
                            إليك نظرة عامة على أداء {companyName} اليوم
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
                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="edara-card group relative p-4 sm:p-5"
                        style={{ animationDelay: `${index * 80}ms`, animation: 'fade-in 0.4s ease-out backwards' }}
                    >
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium text-success">
                                <ArrowUpLeft className="h-3.5 w-3.5" />
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            {stat.label}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            {stat.value}
                        </p>
                        {/* Bottom gradient accent */}
                        <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-l ${stat.gradient} opacity-0 transition-all duration-300 group-hover:opacity-100`} />
                    </div>
                ))}
            </div>

            {/* Charts + Activity Grid */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Main Chart */}
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
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>آخر 12 شهر</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            {['أسبوع', 'شهر', 'سنة'].map((period) => (
                                <button
                                    key={period}
                                    className={`btn-sm text-xs rounded-lg px-3 py-1.5 transition-colors ${period === 'شهر'
                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                                        : 'btn-ghost'
                                        }`}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="edara-empty flex h-48 sm:h-64 items-center justify-center">
                        <div className="text-center">
                            <BarChart3 className="mx-auto mb-2 h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                سيتم عرض الرسم البياني بعد إضافة البيانات
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
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>آخر 24 ساعة</p>
                        </div>
                    </div>
                    <div className="edara-empty flex h-48 sm:h-64 items-center justify-center">
                        <div className="text-center">
                            <Clock className="mx-auto mb-2 h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                لا توجد عمليات حتى الآن
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
