import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Plus, Search, Filter, X, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getPurchaseOrders, approvePurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder } from '@/lib/services/purchases'
import type { PurchaseOrderWithRefs, PurchaseOrderFilters, PurchaseOrderStatus } from '@/lib/types/purchases'
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/lib/types/purchases'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { exportToCSV } from '@/lib/utils/exportCSV'
import { toast } from 'sonner'

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'نقدي',
    credit: 'آجل',
    bank_transfer: 'تحويل بنكي',
    instapay: 'إنستاباي',
    check: 'شيك',
}

export function PurchaseOrdersPage() {
    usePageTitle('أوامر الشراء')
    const { can, profile } = useAuthStore()
    const navigate = useNavigate()

    const [orders, setOrders] = useState<PurchaseOrderWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterStatus, setFilterStatus] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })
    }, [])

    const loadOrders = useCallback(async () => {
        setLoading(true)
        try {
            const filters: PurchaseOrderFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as PurchaseOrderStatus) || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            }
            const result = await getPurchaseOrders(filters)
            setOrders(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل أوامر الشراء')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus, dateFrom, dateTo])

    useEffect(() => { loadOrders() }, [loadOrders])

    const handleApprove = async (id: string) => {
        try {
            await approvePurchaseOrder(id, profile?.id || '')
            toast.success('تم اعتماد أمر الشراء')
            loadOrders()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الاعتماد')
        }
    }

    const [cancelId, setCancelId] = useState<string | null>(null)
    const [cancelReason, setCancelReason] = useState('')

    const handleCancel = async () => {
        if (!cancelId || !cancelReason.trim()) return
        try {
            await cancelPurchaseOrder(cancelId, cancelReason.trim(), profile?.id || '')
            toast.success('تم إلغاء أمر الشراء')
            setCancelId(null)
            setCancelReason('')
            loadOrders()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الإلغاء')
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deletePurchaseOrder(id)
            toast.success('تم حذف أمر الشراء')
            loadOrders()
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(null)
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">أوامر الشراء</h1>
                        <p className="page-subtitle">{total} أمر شراء</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => exportToCSV(orders, [
                        { key: 'order_number', label: 'الرقم' },
                        { key: 'order_date', label: 'التاريخ' },
                        { key: 'total_amount', label: 'الإجمالي' },
                        { key: 'status', label: 'الحالة' },
                    ], 'أوامر_الشراء')} className="btn btn-secondary" title="تصدير CSV">
                        <Download className="h-4 w-4" />
                    </button>
                    {can('purchases.orders.create') && (
                        <button onClick={() => navigate('/purchases/new')} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> أمر شراء جديد
                        </button>
                    )}
                </div>
            </div>

            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث برقم الأمر..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(PO_STATUS_LABELS) as [PurchaseOrderStatus, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {(search || filterStatus || dateFrom || dateTo) && (
                        <button onClick={() => { setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-3">
                    <div style={{ minWidth: '9rem' }}>
                        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                            className="form-input text-sm" title="من تاريخ" />
                    </div>
                    <div style={{ minWidth: '9rem' }}>
                        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                            className="form-input text-sm" title="إلى تاريخ" />
                    </div>
                </div>
            </div>

            <div className="edara-card overflow-x-auto">
                <table className="data-table" style={{ minWidth: '800px' }}>
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>التاريخ</th>
                            <th>المورد</th>
                            <th>المخزن</th>
                            <th>الفرع</th>
                            <th>الدفع</th>
                            <th>الإجمالي</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="data-table-skeleton">
                                    {Array.from({ length: 9 }).map((_, j) => (
                                        <td key={j}><div className="skel-line" style={{ width: j === 2 ? '70%' : '85%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={9} className="data-table-empty">لا توجد أوامر شراء</td></tr>
                        ) : orders.map(o => (
                            <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/purchases/${o.id}`)}>
                                <td className="font-mono text-sm">{o.order_number}</td>
                                <td>{new Date(o.order_date).toLocaleDateString('ar-EG')}</td>
                                <td>{o.supplier?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{o.warehouse?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{o.branch?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
                                <td className="font-semibold">{formatCurrency(o.total_amount)}</td>
                                <td><span className={`badge ${PO_STATUS_COLORS[o.status]}`}>{PO_STATUS_LABELS[o.status]}</span></td>
                                <td onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                        {o.status === 'draft' && can('purchases.orders.approve') && (
                                            <button onClick={() => handleApprove(o.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-success)' }}>اعتماد</button>
                                        )}
                                        {(o.status === 'draft' || o.status === 'approved') && can('purchases.orders.cancel') && (
                                            <button onClick={() => setCancelId(o.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>إلغاء</button>
                                        )}
                                        {o.status === 'draft' && can('purchases.orders.delete') && (
                                            <button onClick={() => setConfirmId(o.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>حذف</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {orders.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan={6}>الإجمالي</td>
                                <td style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(orders.reduce((s, o) => s + o.total_amount, 0))}</td>
                                <td colSpan={2}></td>
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

            <ConfirmDialog open={!!confirmId} title="حذف أمر الشراء" message="هل أنت متأكد من حذف هذا الأمر؟"
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {/* Cancel Reason Modal */}
            {cancelId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setCancelId(null)}>
                    <div className="edara-card w-full max-w-md p-6" style={{ animation: 'scale-in 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>إلغاء أمر الشراء</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">سبب الإلغاء *</label>
                                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                                    rows={3} className="form-input" placeholder="اكتب سبب الإلغاء..." />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setCancelId(null)} className="btn btn-secondary">تراجع</button>
                                <button onClick={handleCancel} disabled={!cancelReason.trim()}
                                    className="btn" style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}>تأكيد الإلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
