import { useState, useEffect, useCallback } from 'react'
import { FileText, ChevronLeft, ChevronRight, Filter, ChevronDown, Eye } from 'lucide-react'
import { getAuditLogs, getCompanySettings } from '@/lib/services/settings'
import { getProfiles, getRoles, getPermissions } from '@/lib/services/auth'
import type { Role, Permission } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const actionLabels: Record<string, { label: string; badge: string }> = {
    INSERT: { label: 'إنشاء', badge: 'badge-success' },
    UPDATE: { label: 'تعديل', badge: 'badge-warning' },
    DELETE: { label: 'حذف', badge: 'badge-danger' },
}

const tableLabels: Record<string, string> = {
    profiles: 'المستخدمين',
    roles: 'الأدوار',
    role_permissions: 'صلاحيات الأدوار',
    user_roles: 'أدوار المستخدمين',
    departments: 'الأقسام',
    company_settings: 'الإعدادات',
}

// Human-readable labels for common database fields
const fieldLabels: Record<string, string> = {
    id: 'المعرّف',
    full_name: 'الاسم الكامل',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    is_active: 'الحالة',
    created_at: 'تاريخ الإنشاء',
    updated_at: 'تاريخ التحديث',
    name: 'الاسم',
    display_name: 'الاسم المعروض',
    description: 'الوصف',
    is_system: 'نظامي',
    role_id: 'الدور',
    user_id: 'المستخدم',
    permission_id: 'الصلاحية',
    key: 'المفتاح',
    value: 'القيمة',
    category: 'الفئة',
    parent_id: 'القسم الأب',
    manager_id: 'المدير',
    department_id: 'القسم',
}

export function AuditLogPage() {
    const [logs, setLogs] = useState<{
        id: string; table_name: string; record_id: string; action: string;
        old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null;
        user_id: string | null; ip_address: string | null; created_at: string;
    }[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [filterTable, setFilterTable] = useState('')
    const [filterAction, setFilterAction] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [pageSize, setPageSize] = useState(20)
    const [userNames, setUserNames] = useState<Record<string, string>>({})
    const [roleNames, setRoleNames] = useState<Record<string, string>>({})
    const [permNames, setPermNames] = useState<Record<string, string>>({})

    // Load page size from company settings + lookups for display
    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Number(maxRows.value) || 20)
        }).catch(() => { /* keep default */ })

        // Load all profiles for name lookup
        getProfiles().then(profiles => {
            const map: Record<string, string> = {}
            for (const p of profiles) {
                map[p.id] = p.full_name || 'بدون اسم'
            }
            setUserNames(map)
        }).catch(() => { /* ignore */ })

        // Load roles for role_id lookup
        getRoles().then((roles: Role[]) => {
            const map: Record<string, string> = {}
            for (const r of roles) {
                map[r.id] = r.display_name
            }
            setRoleNames(map)
        }).catch(() => { /* ignore */ })

        // Load permissions for permission_id lookup
        getPermissions().then((perms: Permission[]) => {
            const map: Record<string, string> = {}
            for (const p of perms) {
                map[p.id] = `${p.module}.${p.entity}.${p.action}`
            }
            setPermNames(map)
        }).catch(() => { /* ignore */ })
    }, [])

    const loadLogs = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getAuditLogs({
                page,
                pageSize,
                tableName: filterTable || undefined,
                action: filterAction || undefined,
            })
            setLogs(result.data)
            setTotal(result.total)
        } catch {
            toast.error('خطأ في تحميل السجل')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, filterTable, filterAction])

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    const formatDate = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const getUserName = (userId: string | null) => {
        if (!userId) return 'نظام'
        return userNames[userId] || userId.slice(0, 8) + '...'
    }

    // Format a value for display — resolve UUIDs where possible
    const formatValue = (key: string, value: unknown): string => {
        if (value === null || value === undefined) return '—'
        if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
        if (key === 'is_active') return value ? 'نشط' : 'معطّل'
        if (key === 'is_system') return value ? 'نظامي' : 'مخصص'

        const strVal = String(value)

        // Resolve user references
        if ((key === 'user_id' || key === 'manager_id') && userNames[strVal]) {
            return userNames[strVal]!
        }

        // Resolve role references
        if (key === 'role_id' && roleNames[strVal]) {
            return roleNames[strVal]!
        }

        // Resolve permission references
        if (key === 'permission_id' && permNames[strVal]) {
            return permNames[strVal]!
        }

        // Format dates
        if ((key === 'created_at' || key === 'updated_at') && strVal.includes('T')) {
            return formatDate(strVal)
        }

        // Truncate remaining long UUIDs
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strVal)) {
            return strVal.slice(0, 8) + '...'
        }

        return strVal
    }

    // Fields to hide from detail view (internal/redundant)
    const hiddenFields = new Set(['id', 'created_at', 'updated_at', 'conditions'])

    // Build a summary of what changed
    const getChangeSummary = (log: typeof logs[0]): string => {
        const data = log.new_data || log.old_data
        if (!data) return ''

        if (log.table_name === 'company_settings' && data.key) {
            return `${data.key}: ${data.value ?? ''}`
        }

        // Try to show the most meaningful field
        if (data.full_name) return String(data.full_name)
        if (data.display_name) return String(data.display_name)
        if (data.name) return String(data.name)
        if (data.key) return String(data.key)

        return ''
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <FileText className="h-5.5 w-5.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">سجل التدقيق</h1>
                        <p className="page-subtitle">{total} عملية مسجلة</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <Filter className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <select
                        value={filterTable}
                        onChange={(e) => { setFilterTable(e.target.value); setPage(1) }}
                        className="form-input h-9 w-auto text-xs"
                    >
                        <option value="">كل الجداول</option>
                        {Object.entries(tableLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
                        className="form-input h-9 w-auto text-xs"
                    >
                        <option value="">كل العمليات</option>
                        <option value="INSERT">إنشاء</option>
                        <option value="UPDATE">تعديل</option>
                        <option value="DELETE">حذف</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="edara-card overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-3" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="edara-empty m-5 flex flex-col items-center gap-3 py-16">
                        <FileText className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>لا توجد سجلات</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[540px]">
                                <thead>
                                    <tr className="edara-thead">
                                        <th className="px-3 sm:px-5 py-3 text-start text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>التاريخ</th>
                                        <th className="px-3 sm:px-5 py-3 text-start text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>المستخدم</th>
                                        <th className="px-3 sm:px-5 py-3 text-start text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>الجدول</th>
                                        <th className="px-3 sm:px-5 py-3 text-start text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>العملية</th>
                                        <th className="px-3 sm:px-5 py-3 text-start text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>ملخص</th>
                                        <th className="px-3 sm:px-5 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => {
                                        const actConfig = actionLabels[log.action] || { label: log.action, badge: 'badge-primary' }
                                        const isExpanded = expandedId === log.id
                                        const summary = getChangeSummary(log)

                                        return (
                                            <>
                                                <tr
                                                    key={log.id}
                                                    className="edara-tr-hover transition-colors cursor-pointer"
                                                    style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 30}ms backwards` }}
                                                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                                >
                                                    <td className="px-3 sm:px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }} dir="ltr">{formatDate(log.created_at)}</td>
                                                    <td className="px-3 sm:px-5 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                        {getUserName(log.user_id)}
                                                    </td>
                                                    <td className="px-3 sm:px-5 py-3">
                                                        <span className="badge badge-info">{tableLabels[log.table_name] || log.table_name}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-5 py-3">
                                                        <span className={`badge ${actConfig.badge}`}>{actConfig.label}</span>
                                                    </td>
                                                    <td className="px-3 sm:px-5 py-3 text-xs max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                                        {summary || '—'}
                                                    </td>
                                                    <td className="px-3 sm:px-5 py-3">
                                                        <ChevronDown className={cn(
                                                            'h-4 w-4 transition-transform duration-200',
                                                            isExpanded && 'rotate-180'
                                                        )} style={{ color: 'var(--text-muted)' }} />
                                                    </td>
                                                </tr>
                                                {isExpanded && (() => {
                                                    const data = log.action === 'DELETE' ? log.old_data : log.new_data
                                                    const oldData = log.action === 'UPDATE' ? log.old_data : null

                                                    return (
                                                        <tr key={`detail-${log.id}`}>
                                                            <td colSpan={6} className="p-0">
                                                                <div
                                                                    className="px-4 sm:px-6 py-4 animate-[fade-in_0.2s_ease-out]"
                                                                    style={{ borderBottom: '1px solid var(--divider-color)', backgroundColor: 'var(--empty-bg)' }}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <Eye className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                                                            تفاصيل العملية
                                                                        </span>
                                                                    </div>
                                                                    {!data || Object.keys(data).length === 0 ? (
                                                                        <div className="rounded-lg px-3 py-3 text-center" style={{ backgroundColor: 'var(--card-bg)' }}>
                                                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                                لا تتوفر تفاصيل لهذه العملية
                                                                            </p>
                                                                            <p className="text-[10px] mt-1 font-mono" dir="ltr" style={{ color: 'var(--text-muted)' }}>
                                                                                Record: {log.record_id}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                            {Object.entries(data).map(([key, value]) => {
                                                                                if (key === 'raw_user_meta_data' || key === 'encrypted_password') return null
                                                                                if (hiddenFields.has(key)) return null
                                                                                if (value === null || value === undefined) return null

                                                                                const label = fieldLabels[key] || key
                                                                                const displayValue = formatValue(key, value)
                                                                                const oldValue = oldData ? formatValue(key, oldData[key]) : null
                                                                                const changed = oldData && oldData[key] !== undefined && String(oldData[key]) !== String(value)

                                                                                return (
                                                                                    <div key={key} className="flex flex-col gap-0.5 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--card-bg)' }}>
                                                                                        <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                                                                                            {label}
                                                                                        </span>
                                                                                        <span className="text-xs break-all" style={{ color: changed ? 'var(--color-primary-600)' : 'var(--text-primary)' }}>
                                                                                            {displayValue}
                                                                                            {changed && oldValue && (
                                                                                                <span className="text-[10px] mr-2" style={{ color: 'var(--text-muted)' }}>
                                                                                                    (كان: {oldValue})
                                                                                                </span>
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })()}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    صفحة {page} من {totalPages} ({total} سجل)
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="btn-ghost p-2 rounded-lg disabled:opacity-30"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="btn-ghost p-2 rounded-lg disabled:opacity-30"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
