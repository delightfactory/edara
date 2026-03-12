import {
    HandshakeIcon, Pencil, Trash2, Loader2, Plus,
    ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomerWithRefs } from '@/lib/types/customers'
import {
    CUSTOMER_TYPE_LABELS, CLASSIFICATION_COLORS,
} from '@/lib/types/customers'
import type { CustomerType, CustomerClassification } from '@/lib/types/customers'

interface CustomersTableProps {
    customers: CustomerWithRefs[]
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
    onEdit: (c: CustomerWithRefs) => void
    onDelete: (id: string) => void
    onPageChange: (page: number) => void
    onCreateFirst: () => void
    onRowClick: (id: string) => void
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 2 }).format(val)

export function CustomersTable({
    customers, loading, page, totalPages, total,
    canUpdate, canDelete, canCreate, deleting,
    search, hasFilters,
    onEdit, onDelete, onPageChange, onCreateFirst, onRowClick,
}: CustomersTableProps) {
    return (
        <div className="edara-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '700px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>العميل</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكود</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>النوع</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>التصنيف</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المندوب</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الرصيد</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                            {canUpdate && <th className="px-4 py-3 w-20"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                </tr>
                            ))
                        ) : customers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <HandshakeIcon className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                                            {search || hasFilters ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}
                                        </p>
                                        {!search && !hasFilters && canCreate && (
                                            <button onClick={onCreateFirst} className="btn btn-primary btn-sm mt-1">
                                                <Plus className="h-4 w-4" /> أضف أول عميل
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            customers.map((c, i) => (
                                <tr key={c.id} className="edara-tr-hover transition-all duration-200 cursor-pointer"
                                    style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}
                                    onClick={() => onRowClick(c.id)}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30 shrink-0">
                                                <HandshakeIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                                {c.phone && <p className="text-[11px]" dir="ltr" style={{ color: 'var(--text-muted)' }}>{c.phone}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>{c.code || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="badge badge-info text-[10px]">{CUSTOMER_TYPE_LABELS[c.customer_type as CustomerType]}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('badge', CLASSIFICATION_COLORS[c.classification as CustomerClassification])}>{c.classification}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {c.assigned_rep?.full_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold tabular-nums" dir="ltr"
                                        style={{ color: c.current_balance > 0 ? 'var(--color-danger)' : c.current_balance < 0 ? 'var(--color-primary-600)' : 'var(--text-muted)' }}>
                                        {formatCurrency(c.current_balance)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('badge', c.is_active ? 'badge-success' : 'badge-danger')}>{c.is_active ? 'نشط' : 'معطّل'}</span>
                                    </td>
                                    {canUpdate && (
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => onEdit(c)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                    <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => onDelete(c.id)} disabled={deleting === c.id}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                        {deleting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
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
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {page} من {totalPages} ({total} عميل)</p>
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
