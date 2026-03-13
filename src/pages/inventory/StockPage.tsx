import React, { useState, useEffect, useCallback } from 'react'
import {
    Package, Search, Filter, Warehouse as WarehouseIcon,
    AlertTriangle, ChevronLeft, ChevronRight, ChevronDown,
    Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCompanySettings } from '@/lib/services/settings'
import { getStock, getWarehouses, getStockBatches } from '@/lib/services/inventory'
import type { StockWithRefs, StockFilters, StockBatchWithRefs } from '@/lib/types/inventory'
import type { WarehouseWithRefs } from '@/lib/types/inventory'
import { WAREHOUSE_TYPE_LABELS } from '@/lib/types/inventory'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function StockPage() {
    usePageTitle('المخزون')

    const [stock, setStock] = useState<StockWithRefs[]>([])
    const [warehouses, setWarehouses] = useState<WarehouseWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Filters
    const [search, setSearch] = useState('')
    const [filterWarehouse, setFilterWarehouse] = useState('')
    const [lowStockOnly, setLowStockOnly] = useState(false)

    // Batches expansion
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [batches, setBatches] = useState<StockBatchWithRefs[]>([])
    const [loadingBatches, setLoadingBatches] = useState(false)

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        getWarehouses().then(w => setWarehouses(w)).catch(() => { })
    }, [])

    const loadStock = useCallback(async () => {
        setLoading(true)
        try {
            const filters: StockFilters = {
                page, pageSize,
                warehouse_id: filterWarehouse || undefined,
                search: search || undefined,
                low_stock_only: lowStockOnly || undefined,
            }
            const result = await getStock(filters)
            setStock(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل أرصدة المخزون')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, filterWarehouse, search, lowStockOnly])

    useEffect(() => { loadStock() }, [loadStock])

    const formatNumber = (val: number) =>
        new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 0 }).format(val)

    const toggleBatches = async (stockItem: StockWithRefs) => {
        if (expandedId === stockItem.id) {
            setExpandedId(null)
            setBatches([])
            return
        }
        setExpandedId(stockItem.id)
        setLoadingBatches(true)
        try {
            const data = await getStockBatches(stockItem.product_id, stockItem.warehouse_id)
            setBatches(data)
        } catch {
            setBatches([])
        } finally {
            setLoadingBatches(false)
        }
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d))
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <Package className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">أرصدة المخزون</h1>
                    <p className="page-subtitle">عرض الأرصدة الفعلية في جميع المستودعات (للقراءة فقط)</p>
                </div>
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="بحث بالمنتج أو الكود..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '10rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل المستودعات</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1) }}
                        className={cn('btn btn-sm', lowStockOnly ? 'btn-danger' : 'btn-secondary')}
                    >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {lowStockOnly ? 'إلغاء فلتر النقص' : 'أرصدة منخفضة'}
                    </button>
                </div>
            </div>

            {/* Stock Table */}
            <div className="edara-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: '700px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المستودع</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية الفعلية</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية المحجوزة</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المتاح</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                                    </tr>
                                ))
                            ) : stock.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                                <Package className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                                                {search || filterWarehouse || lowStockOnly ? 'لا توجد نتائج مطابقة' : 'لا توجد أرصدة مخزنية'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                stock.map((item, i) => {
                                    const available = item.quantity - item.reserved_qty
                                    const isLow = item.product && item.quantity <= item.product.min_stock
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className="edara-tr-hover transition-all duration-200 cursor-pointer"
                                                style={{ borderBottom: expandedId === item.id ? 'none' : '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}
                                                onClick={() => toggleBatches(item)}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30 shrink-0">
                                                            <Package className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.product?.name || '—'}</p>
                                                            {item.product?.sku && <p className="text-[11px] font-mono" dir="ltr" style={{ color: 'var(--text-muted)' }}>{item.product.sku}</p>}
                                                        </div>
                                                        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', expandedId === item.id && 'rotate-180')} style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <WarehouseIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                        <div>
                                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.warehouse?.name || '—'}</span>
                                                            {item.warehouse?.type && (
                                                                <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>{WAREHOUSE_TYPE_LABELS[item.warehouse.type]}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                                    <span dir="ltr">{formatNumber(item.quantity)}</span>
                                                    {(item.product as unknown as { unit?: { symbol?: string } })?.unit?.symbol && (
                                                        <span className="text-[10px] mr-1" style={{ color: 'var(--text-muted)' }}>{(item.product as unknown as { unit: { symbol: string } }).unit.symbol}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm tabular-nums" style={{ color: item.reserved_qty > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                                                    <span dir="ltr">{formatNumber(item.reserved_qty)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold tabular-nums" style={{ color: available > 0 ? 'var(--color-primary-600)' : 'var(--color-danger)' }}>
                                                    <span dir="ltr">{formatNumber(available)}</span>
                                                    {(item.product as unknown as { unit?: { symbol?: string } })?.unit?.symbol && (
                                                        <span className="text-[10px] mr-1" style={{ color: 'var(--text-muted)' }}>{(item.product as unknown as { unit: { symbol: string } }).unit.symbol}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isLow ? (
                                                        <span className="badge badge-danger text-[9px]">
                                                            <AlertTriangle className="h-2.5 w-2.5 inline ml-0.5" /> أقل من الحد
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-success text-[10px]">متوفر</span>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedId === item.id && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-0" style={{ backgroundColor: 'var(--empty-bg)', borderBottom: '1px solid var(--divider-color)' }}>
                                                        <div className="py-3 pr-12">
                                                            <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                                                <Layers className="h-3 w-3" /> تشغيلات هذا المنتج (FEFO)
                                                            </p>
                                                            {loadingBatches ? (
                                                                <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--text-muted)' }}>
                                                                    <div className="skeleton h-3 w-3 rounded-full" /> جاري التحميل...
                                                                </div>
                                                            ) : batches.length === 0 ? (
                                                                <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>لا توجد تشغيلات لهذا المنتج</p>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    {batches.map(b => (
                                                                        <div key={b.id} className="flex items-center gap-4 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--card-bg)' }}>
                                                                            <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }} dir="ltr">#{b.batch_number}</span>
                                                                            <span style={{ color: 'var(--text-secondary)' }}>الصلاحية: {formatDate(b.expiry_date)}</span>
                                                                            <span className="font-bold tabular-nums" dir="ltr" style={{ color: 'var(--color-primary-600)' }}>{formatNumber(b.quantity)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {page} من {totalPages} ({total} سجل)</p>
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
