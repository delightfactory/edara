import {
    Building2, Pencil, Trash2, Loader2, Plus,
    ChevronLeft, ChevronRight, Factory,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SupplierWithRefs } from '@/lib/types/suppliers'
import { PAYMENT_TERMS_LABELS } from '@/lib/types/suppliers'
import type { PaymentTermsType } from '@/lib/types/customers'

interface SuppliersTableProps {
    suppliers: SupplierWithRefs[]
    loading: boolean
    page: number
    totalPages: number
    total: number
    canUpdate: boolean
    canDelete: boolean
    canCreate: boolean
    deleting: string | null
    search: string
    onEdit: (s: SupplierWithRefs) => void
    onDelete: (id: string) => void
    onPageChange: (page: number) => void
    onCreateFirst: () => void
    onRowClick: (id: string) => void
}

export function SuppliersTable({
    suppliers, loading, page, totalPages, total,
    canUpdate, canDelete, canCreate, deleting, search,
    onEdit, onDelete, onPageChange, onCreateFirst, onRowClick,
}: SuppliersTableProps) {
    return (
        <div className="edara-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '700px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المورد</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكود</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>شروط الدفع</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>العلامات التجارية</th>
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
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-32" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                </tr>
                            ))
                        ) : suppliers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <Building2 className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                                            {search ? 'لا توجد نتائج مطابقة' : 'لا يوجد موردين بعد'}
                                        </p>
                                        {!search && canCreate && (
                                            <button onClick={onCreateFirst} className="btn btn-primary btn-sm mt-1">
                                                <Plus className="h-4 w-4" /> أضف أول مورد
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            suppliers.map((s, i) => (
                                <tr key={s.id} className="edara-tr-hover transition-all duration-200 cursor-pointer"
                                    style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}
                                    onClick={() => onRowClick(s.id)}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                                                s.is_manufacturer ? "bg-amber-50 dark:bg-amber-950/30" : "bg-primary-50 dark:bg-primary-950/30"
                                            )}>
                                                {s.is_manufacturer
                                                    ? <Factory className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    : <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                                                    {s.is_manufacturer && <span className="badge badge-warning text-[9px]">مُصنّع</span>}
                                                </div>
                                                {s.phone && <p className="text-[11px]" dir="ltr" style={{ color: 'var(--text-muted)' }}>{s.phone}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>{s.code || '—'}</td>
                                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {PAYMENT_TERMS_LABELS[s.payment_terms as PaymentTermsType]}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {s.brands.length > 0
                                                ? s.brands.map(b => (
                                                    <span key={b.id} className="badge badge-info text-[9px]">{b.name}</span>
                                                ))
                                                : <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                                            }
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('badge', s.is_active ? 'badge-success' : 'badge-danger')}>{s.is_active ? 'نشط' : 'معطّل'}</span>
                                    </td>
                                    {canUpdate && (
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => onEdit(s)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                    <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => onDelete(s.id)} disabled={deleting === s.id}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                        {deleting === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
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
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {page} من {totalPages} ({total} مورد)</p>
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
