import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardCheck, Search, Filter, X, CheckCircle, XCircle, Image } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getPaymentProofs, updatePaymentProofStatus } from '@/lib/services/sales'
import type { PaymentProofWithRefs, PaymentProofFilters, PaymentProofStatus } from '@/lib/types/sales'
import { PAYMENT_PROOF_STATUS_LABELS, PAYMENT_PROOF_STATUS_COLORS } from '@/lib/types/sales'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function PaymentProofsPage() {
    usePageTitle('إثباتات الدفع')
    const { can, profile } = useAuthStore()

    const [proofs, setProofs] = useState<PaymentProofWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterStatus, setFilterStatus] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    // Review modal
    const [reviewing, setReviewing] = useState<PaymentProofWithRefs | null>(null)
    const [reviewNotes, setReviewNotes] = useState('')

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })
    }, [])

    const loadProofs = useCallback(async () => {
        setLoading(true)
        try {
            const filters: PaymentProofFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as PaymentProofStatus) || undefined,
            }
            const result = await getPaymentProofs(filters)
            setProofs(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل الإثباتات')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus])

    useEffect(() => { loadProofs() }, [loadProofs])

    const handleReview = async (status: 'approved' | 'rejected') => {
        if (!reviewing) return
        try {
            await updatePaymentProofStatus(reviewing.id, status, profile?.id || '', reviewNotes)
            toast.success(status === 'approved' ? 'تم قبول الإثبات' : 'تم رفض الإثبات')
            setReviewing(null)
            setReviewNotes('')
            loadProofs()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل التحديث')
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <ClipboardCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">إثباتات الدفع</h1>
                    <p className="page-subtitle">{total} إثبات</p>
                </div>
            </div>

            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(PAYMENT_PROOF_STATUS_LABELS) as [PaymentProofStatus, string][]).map(([val, label]) => (
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
                <table className="data-table" style={{ minWidth: '700px' }}>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المرجع</th>
                            <th>المبلغ</th>
                            <th>رافع الإثبات</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="data-table-skeleton">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j}><div className="skel-line" style={{ width: '80%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : proofs.length === 0 ? (
                            <tr><td colSpan={7} className="data-table-empty">لا توجد إثباتات</td></tr>
                        ) : proofs.map(p => (
                            <tr key={p.id}>
                                <td>{new Date(p.created_at).toLocaleDateString('ar-EG')}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.reference_type}#{p.reference_id?.substring(0, 8)}</td>
                                <td className="font-semibold">{formatCurrency(p.amount)}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.uploader?.full_name || '—'}</td>
                                <td><span className={`badge ${PAYMENT_PROOF_STATUS_COLORS[p.status]}`}>{PAYMENT_PROOF_STATUS_LABELS[p.status]}</span></td>
                                <td className="max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        {p.image_url && (
                                            <a href={p.image_url} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs" onClick={e => e.stopPropagation()}>
                                                <Image className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                        {p.status === 'pending' && can('finance.collections.approve') && (
                                            <button onClick={() => setReviewing(p)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-success)' }}>مراجعة</button>
                                        )}
                                    </div>
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

            {/* Review Modal */}
            {reviewing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setReviewing(null)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>مراجعة إثبات الدفع</h2>
                        <div className="space-y-3 mb-4 text-sm">
                            <div><span style={{ color: 'var(--text-muted)' }}>المبلغ:</span> <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(reviewing.amount)}</strong></div>
                            {reviewing.image_url && (
                                <div><a href={reviewing.image_url} target="_blank" rel="noreferrer" className="text-primary-600 underline">عرض صورة الإثبات</a></div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">ملاحظات المراجعة</label>
                                <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3} className="form-input" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleReview('rejected')} className="btn btn-secondary" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                                    <XCircle className="h-4 w-4" /> رفض
                                </button>
                                <button onClick={() => handleReview('approved')} className="btn btn-primary" style={{ backgroundColor: 'var(--color-success)' }}>
                                    <CheckCircle className="h-4 w-4" /> قبول
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
