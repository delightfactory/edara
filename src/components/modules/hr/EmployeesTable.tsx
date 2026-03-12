import {
    UserCircle2, Pencil, Trash2, Loader2, Plus,
    ChevronLeft, ChevronRight, Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmployeeWithRefs } from '@/lib/types/hr'
import { REP_TYPE_LABELS, REP_TYPE_BADGES } from '@/lib/types/hr'
import type { RepType } from '@/lib/types/hr'

interface EmployeesTableProps {
    employees: EmployeeWithRefs[]
    loading: boolean
    page: number
    totalPages: number
    total: number
    canUpdate: boolean
    canDelete: boolean
    canCreate: boolean
    deleting: string | null
    search: string
    hasFilters: boolean
    onEdit: (e: EmployeeWithRefs) => void
    onDelete: (id: string) => void
    onPageChange: (page: number) => void
    onCreateFirst: () => void
    onRowClick: (id: string) => void
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 0 }).format(val)

export function EmployeesTable({
    employees, loading, page, totalPages, total,
    canUpdate, canDelete, canCreate, deleting,
    search, hasFilters,
    onEdit, onDelete, onPageChange, onCreateFirst, onRowClick,
}: EmployeesTableProps) {
    return (
        <div className="edara-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '750px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الموظف</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكود</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>القسم</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المسمى</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>مندوب/سائق</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الراتب</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                            {canUpdate && <th className="px-4 py-3 w-20"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                </tr>
                            ))
                        ) : employees.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <UserCircle2 className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                                            {search || hasFilters ? 'لا توجد نتائج مطابقة' : 'لا يوجد موظفين بعد'}
                                        </p>
                                        {!search && !hasFilters && canCreate && (
                                            <button onClick={onCreateFirst} className="btn btn-primary btn-sm mt-1">
                                                <Plus className="h-4 w-4" /> أضف أول موظف
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            employees.map((e, i) => (
                                <tr key={e.id} className="edara-tr-hover transition-all duration-200 cursor-pointer"
                                    style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}
                                    onClick={() => onRowClick(e.id)}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                                                e.sales_rep ? "bg-amber-50 dark:bg-amber-950/30" : "bg-primary-50 dark:bg-primary-950/30"
                                            )}>
                                                {e.sales_rep
                                                    ? <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    : <UserCircle2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                                }
                                            </div>
                                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {e.profile?.full_name || '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>{e.employee_code || '—'}</td>
                                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{e.department?.name || '—'}</td>
                                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{e.job_title || '—'}</td>
                                    <td className="px-4 py-3">
                                        {e.sales_rep ? (
                                            <span className={cn('badge text-[9px]', REP_TYPE_BADGES[e.sales_rep.rep_type as RepType])}>
                                                {REP_TYPE_LABELS[e.sales_rep.rep_type as RepType]}
                                            </span>
                                        ) : (
                                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm tabular-nums" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                                        {formatCurrency(e.salary)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('badge', e.is_active ? 'badge-success' : 'badge-danger')}>{e.is_active ? 'نشط' : 'معطّل'}</span>
                                    </td>
                                    {canUpdate && (
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => onEdit(e)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                    <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => onDelete(e.id)} disabled={deleting === e.id}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                        {deleting === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {page} من {totalPages} ({total} موظف)</p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="btn btn-ghost btn-icon disabled:opacity-30">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn btn-ghost btn-icon disabled:opacity-30">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
