import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageCheck, Search, Filter, X, Plus, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getPurchaseReceipts, approvePurchaseReceipt } from '@/lib/services/purchases'
import type { PurchaseReceiptWithRefs, PurchaseReceiptFilters, ReceiptStatus } from '@/lib/types/purchases'
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_COLORS } from '@/lib/types/purchases'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function PurchaseReceiptsPage() {
    usePageTitle('إذون الاستلام')
    const { can, profile } = useAuthStore()

    const [receipts, setReceipts] = useState<PurchaseReceiptWithRefs[]>([])
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

    const loadReceipts = useCallback(async () => {
        setLoading(true)
        try {
            const filters: PurchaseReceiptFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as ReceiptStatus) || undefined,
            }
            const result = await getPurchaseReceipts(filters)
            setReceipts(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل إذون الاستلام')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus])

    useEffect(() => { loadReceipts() }, [loadReceipts])

    const handleApprove = async (id: string) => {
        try {
            await approvePurchaseReceipt(id, profile?.id || '')
            toast.success('تم اعتماد إذن الاستلام')
            loadReceipts()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الاعتماد')
        }
    }

    const navigate = useNavigate()

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <PackageCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">إذون الاستلام</h1>
                        <p className="page-subtitle">{total} إذن</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        const rows = receipts.map(r => ({
                            'الرقم': r.receipt_number,
                            'التاريخ': r.received_date,
                            'أمر الشراء': r.purchase_order?.order_number || '',
                            'المورد': r.purchase_order?.supplier?.name || '',
                            'المخزن': r.warehouse?.name || '',
                            'الحالة': RECEIPT_STATUS_LABELS[r.status] || r.status,
                        }))
                        const csv = '\uFEFF' + Object.keys(rows[0] || {}).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'إذون_الاستلام.csv'; a.click()
                    }} className="btn btn-secondary" title="تصدير CSV">
                        <Download className="h-4 w-4" />
                    </button>
                    {can('purchases.receipts.create') && (
                        <button onClick={() => navigate('/purchases/receipts/new')} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> إذن استلام جديد
                        </button>
                    )}
                </div>
            </div>

            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث برقم الإذن..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(RECEIPT_STATUS_LABELS) as [ReceiptStatus, string][]).map(([val, label]) => (
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
                <table className="data-table" style={{ minWidth: '850px' }}>
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>التاريخ</th>
                            <th>أمر الشراء</th>
                            <th>المورد</th>
                            <th>المخزن</th>
                            <th>المستلم</th>
                            <th>المعتمد</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="data-table-skeleton">
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <td key={j}><div className="skel-line" style={{ width: '80%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : receipts.length === 0 ? (
                            <tr><td colSpan={10} className="data-table-empty">لا توجد إذون استلام</td></tr>
                        ) : receipts.map(r => (
                            <tr key={r.id}>
                                <td className="font-mono text-sm">{r.receipt_number}</td>
                                <td>{new Date(r.received_date).toLocaleDateString('ar-EG')}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.purchase_order?.order_number || '—'}</td>
                                <td>{r.purchase_order?.supplier?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.warehouse?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.receiver?.full_name || '—'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{r.approver?.full_name || '—'}</td>
                                <td><span className={`badge ${RECEIPT_STATUS_COLORS[r.status]}`}>{RECEIPT_STATUS_LABELS[r.status]}</span></td>
                                <td className="max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }}>{r.notes || '—'}</td>
                                <td>
                                    {r.status === 'pending_approval' && can('purchases.receipts.approve') && (
                                        <button onClick={() => handleApprove(r.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-success)' }}>اعتماد</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
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
