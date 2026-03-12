import { useState, useEffect, useCallback } from 'react'
import {
    ArrowDownUp, Filter, ChevronLeft, ChevronRight,
    ArrowDownToLine, ArrowUpFromLine, AlertTriangle,
    RotateCcw, Trash2 as Scrap, Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCompanySettings } from '@/lib/services/settings'
import { getStockMovements, getWarehouses } from '@/lib/services/inventory'
import type { StockMovementWithRefs, MovementType } from '@/lib/types/inventory'
import { MOVEMENT_TYPE_LABELS } from '@/lib/types/inventory'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

const MOVEMENT_TYPE_ICONS: Record<MovementType, typeof ArrowDownToLine> = {
    purchase_in: ArrowDownToLine,
    sales_out: ArrowUpFromLine,
    transfer_in: ArrowDownToLine,
    transfer_out: ArrowUpFromLine,
    adjustment: AlertTriangle,
    return_in: RotateCcw,
    return_out: RotateCcw,
    scrap: Scrap,
    initial: Database,
}

const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
    purchase_in: 'text-success bg-emerald-50 dark:bg-emerald-950/30',
    sales_out: 'text-danger bg-red-50 dark:bg-red-950/30',
    transfer_in: 'text-info bg-blue-50 dark:bg-blue-950/30',
    transfer_out: 'text-warning bg-amber-50 dark:bg-amber-950/30',
    adjustment: 'text-warning bg-amber-50 dark:bg-amber-950/30',
    return_in: 'text-info bg-blue-50 dark:bg-blue-950/30',
    return_out: 'text-danger bg-red-50 dark:bg-red-950/30',
    scrap: 'text-danger bg-red-50 dark:bg-red-950/30',
    initial: 'text-primary-600 bg-primary-50 dark:bg-primary-950/30',
}

const IN_TYPES: MovementType[] = ['purchase_in', 'transfer_in', 'return_in', 'initial']

const formatDate = (d: string) => new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(d))

export function StockMovementsPage() {
    usePageTitle('حركات المخزون')
    const [movements, setMovements] = useState<StockMovementWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Filters
    const [filterWarehouse, setFilterWarehouse] = useState('')
    const [filterType, setFilterType] = useState('')
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(s => {
            const mr = s.find(c => c.key === 'max_rows_per_page')
            if (mr?.value) setPageSize(Math.min(Number(mr.value) || 25, 50))
        }).catch(() => { })

        getWarehouses().then(data =>
            setWarehouses(data.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })))
        ).catch(() => { })
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getStockMovements({
                page, pageSize,
                warehouse_id: filterWarehouse || undefined,
                movement_type: filterType || undefined,
            })
            setMovements(result.data)
            setTotal(result.total)
        } catch {
            toast.error('فشل تحميل حركات المخزون')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, filterWarehouse, filterType])

    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <ArrowDownUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">حركات المخزون</h1>
                    <p className="page-subtitle">{total} حركة — للعرض فقط</p>
                </div>
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل المخازن</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الأنواع</option>
                            {(Object.entries(MOVEMENT_TYPE_LABELS) as [MovementType, string][]).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="edara-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: '750px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>نوع الحركة</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المخزن</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>ملاحظات</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>بواسطة</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <ArrowDownUp className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                        <p style={{ color: 'var(--text-muted)' }}>لا توجد حركات</p>
                                    </td>
                                </tr>
                            ) : (
                                movements.map((m, i) => {
                                    const Icon = MOVEMENT_TYPE_ICONS[m.movement_type] || ArrowDownUp
                                    const colorClass = MOVEMENT_TYPE_COLORS[m.movement_type] || ''
                                    const isIn = IN_TYPES.includes(m.movement_type)
                                    return (
                                        <tr key={m.id} className="edara-tr-hover"
                                            style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 30}ms backwards` }}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', colorClass)}>
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {MOVEMENT_TYPE_LABELS[m.movement_type]}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.product?.name || '—'}</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.warehouse?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn('text-sm font-bold tabular-nums', isIn ? 'text-success' : 'text-danger')} dir="ltr">
                                                    {isIn ? '+' : '-'}{m.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>{m.notes || '—'}</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.creator?.full_name || '—'}</td>
                                            <td className="px-4 py-3 text-xs" dir="ltr" style={{ color: 'var(--text-muted)' }}>{formatDate(m.created_at)}</td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {page} من {totalPages} ({total} حركة)</p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn btn-ghost btn-icon disabled:opacity-30">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn btn-ghost btn-icon disabled:opacity-30">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
