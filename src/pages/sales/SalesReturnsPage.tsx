import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Undo2, Search, Filter, X, Plus, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getSalesReturns, confirmSalesReturn } from '@/lib/services/sales'
import type { SalesReturnWithRefs, SalesReturnFilters, OrderStatus } from '@/lib/types/sales'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types/sales'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function SalesReturnsPage() {
    usePageTitle('مرتجعات المبيعات')
    const { can, profile } = useAuthStore()

    const [returns, setReturns] = useState<SalesReturnWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterStatus, setFilterStatus] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })
    }, [])

    const loadReturns = useCallback(async () => {
        setLoading(true)
        try {
            const filters: SalesReturnFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as OrderStatus) || undefined,
            }
            const result = await getSalesReturns(filters)
            setReturns(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل المرتجعات')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus])

    useEffect(() => { loadReturns() }, [loadReturns])

    const handleConfirm = async (id: string) => {
        try {
            await confirmSalesReturn(id, profile?.id || '')
            toast.success('تم تأكيد المرتجع')
            loadReturns()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل التأكيد')
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const navigate = useNavigate()

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Undo2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">مرتجعات المبيعات</h1>
                        <p className="page-subtitle">{total} مرتجع</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        const rows = returns.map(r => ({
                            'الرقم': r.return_number,
                            'التاريخ': r.return_date,
                            'العميل': r.customer?.name || '',
                            'أمر البيع': r.order?.order_number || '',
                            'الإجمالي': r.total_amount,
                            'الحالة': ORDER_STATUS_LABELS[r.status] || r.status,
                        }))
                        const csv = '\uFEFF' + Object.keys(rows[0] || {}).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'مرتجعات_المبيعات.csv'; a.click()
                    }} className="btn btn-secondary" title="تصدير CSV">
                        <Download className="h-4 w-4" />
                    </button>
                    {can('sales.returns.create') && (
                        <button onClick={() => navigate('/sales/returns/new')} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> مرتجع جديد
                        </button>
                    )}
                </div>
            </div>

            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث برقم المرتجع..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {(search || filterStatus) && (
                        <button onClick={() => { setSearch(''); setFilterStatus(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح
                        </button>
                    )}
                </div>
            </div>

            <div className="edara-card overflow-x-auto">
                <table className="data-table" style={{ minWidth: '900px' }}>
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>التاريخ</th>
                            <th>أمر البيع</th>
                            <th>العميل</th>
                            <th>المخزن</th>
                            <th>الفرع</th>
                            <th>الإجمالي</th>
                            <th>السبب</th>
                            <th>الحالة</th>
                            <th>بواسطة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="data-table-skeleton">
                                    {Array.from({ length: 11 }).map((_, j) => (
                                        <td key={j}><div className="skel-line" style={{ width: '80%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : returns.length === 0 ? (
                            <tr><td colSpan={11} className="data-table-empty">لا توجد مرتجعات</td></tr>
                        ) : returns.map(r => (
                            <tr key={r.id}>
                                <td className="font-mono text-sm">{r.return_number}</td>
                                <td>{new Date(r.return_date).toLocaleDateString('ar-EG')}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.order?.order_number || '—'}</td>
                                <td>{r.customer?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.warehouse?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.branch?.name || '—'}</td>
                                <td className="font-semibold">{formatCurrency(r.total_amount)}</td>
                                <td className="max-w-[150px] truncate" style={{ color: 'var(--text-secondary)' }}>{r.reason || '—'}</td>
                                <td><span className={`badge ${ORDER_STATUS_COLORS[r.status]}`}>{ORDER_STATUS_LABELS[r.status]}</span></td>
                                <td style={{ color: 'var(--text-muted)' }}>{r.creator?.full_name || '—'}</td>
                                <td>
                                    {r.status === 'draft' && can('sales.returns.confirm') && (
                                        <button onClick={() => handleConfirm(r.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-success)' }}>تأكيد</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {returns.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan={6}>الإجمالي</td>
                                <td style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(returns.reduce((s, r) => s + r.total_amount, 0))}</td>
                                <td colSpan={4}></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-sm">السابق</button>
                    <span className="flex items-center px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-sm">التالي</button>
                </div>
            )}
        </div>
    )
}
