import { useState, useEffect, useCallback, useRef } from 'react'
import { CreditCard, Plus, Search, Filter, X, CheckCircle, XCircle, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getSupplierPayments, recordSupplierPayment, confirmSupplierPayment, cancelSupplierPayment, getActiveVaults } from '@/lib/services/finance'
import { getSuppliers } from '@/lib/services/suppliers'
import type { SupplierPaymentWithRefs, SupplierPaymentInput, SupplierPaymentFilters, PaymentStatus, PaymentMethodType } from '@/lib/types/finance'
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/lib/types/finance'
import type { SupplierWithRefs } from '@/lib/types/suppliers'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function SupplierPaymentsPage() {
    usePageTitle('سداد الموردين')
    const { can, profile } = useAuthStore()

    const [payments, setPayments] = useState<SupplierPaymentWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Lookups
    const [suppliers, setSuppliers] = useState<SupplierWithRefs[]>([])
    const [vaults, setVaults] = useState<{ id: string; name: string; type: string }[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterStatus, setFilterStatus] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    // Form
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)

    // Cancel confirm
    const [cancelId, setCancelId] = useState<string | null>(null)

    // Date filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Selected supplier balance
    const [selectedSupplierBalance, setSelectedSupplierBalance] = useState<number | null>(null)

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        Promise.all([
            getSuppliers({ pageSize: 500 }),
            getActiveVaults(),
        ]).then(([s, v]) => {
            setSuppliers(s.data)
            setVaults(v)
        }).catch(() => { })
    }, [])

    const loadPayments = useCallback(async () => {
        setLoading(true)
        try {
            const filters: SupplierPaymentFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as PaymentStatus) || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            }
            const result = await getSupplierPayments(filters)
            setPayments(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل المدفوعات')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus, dateFrom, dateTo])

    useEffect(() => { loadPayments() }, [loadPayments])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data: SupplierPaymentInput = {
            supplier_id: form.get('supplier_id') as string,
            amount: Number(form.get('amount')),
            payment_method: form.get('payment_method') as PaymentMethodType,
            vault_id: form.get('vault_id') as string,
            notes: (form.get('notes') as string) || null,
        }

        if (!data.supplier_id) { toast.error('يرجى اختيار المورد'); return }
        if (!data.amount || data.amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return }
        if (!data.vault_id) { toast.error('يرجى تحديد الخزنة'); return }

        setSaving(true)
        try {
            await recordSupplierPayment(data, profile?.id || '')
            toast.success('تم تسجيل السداد بنجاح')
            setShowForm(false)
            loadPayments()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل تسجيل السداد')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirm = async (id: string) => {
        try {
            await confirmSupplierPayment(id, profile?.id || '')
            toast.success('تم تأكيد السداد')
            loadPayments()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل التأكيد')
        }
    }

    const handleCancel = async (id: string) => {
        setCancelId(null)
        try {
            await cancelSupplierPayment(id, profile?.id || '')
            toast.success('تم إلغاء السداد')
            loadPayments()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الإلغاء')
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <CreditCard className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">سداد الموردين</h1>
                        <p className="page-subtitle">{total} عملية سداد</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        const rows = payments.map(p => ({
                            'الرقم': p.payment_number,
                            'المورد': p.supplier?.name || '',
                            'المبلغ': p.amount,
                            'الطريقة': PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method,
                            'الحالة': PAYMENT_STATUS_LABELS[p.status] || p.status,
                        }))
                        const csv = '\uFEFF' + Object.keys(rows[0] || {}).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'سداد_الموردين.csv'; a.click()
                    }} className="btn btn-secondary" title="تصدير CSV">
                        <Download className="h-4 w-4" />
                    </button>
                    {can('finance.payments.create') && (
                        <button onClick={() => setShowForm(true)} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> تسجيل سداد
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث برقم السداد..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]).map(([val, label]) => (
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
                    <div className="flex-1">
                        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                            className="form-input text-sm" />
                    </div>
                    <div className="flex-1">
                        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                            className="form-input text-sm" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="edara-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>التاريخ</th>
                            <th>المورد</th>
                            <th>المبلغ</th>
                            <th>الطريقة</th>
                            <th>الخزنة</th>
                            <th>بواسطة</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="data-table-empty">جارٍ التحميل...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan={10} className="data-table-empty">لا توجد عمليات سداد</td></tr>
                        ) : payments.map(p => (
                            <tr key={p.id}>
                                <td className="font-mono text-sm" >{p.payment_number}</td>
                                <td >{new Date(p.payment_date).toLocaleDateString('ar-EG')}</td>
                                <td >{p.supplier?.name || '—'}</td>
                                <td className="font-semibold" >{formatCurrency(p.amount)}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{PAYMENT_METHOD_LABELS[p.payment_method]}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.vault?.name || '—'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{p.creator?.full_name || '—'}</td>
                                <td><span className={`badge ${PAYMENT_STATUS_COLORS[p.status]}`}>{PAYMENT_STATUS_LABELS[p.status]}</span></td>
                                <td className="max-w-[120px] truncate" style={{ color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                                <td>
                                    {p.status === 'pending' && (
                                        <div className="flex items-center gap-1">
                                            {can('finance.payments.approve') && (
                                                <button onClick={() => handleConfirm(p.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-success)' }}>
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {can('finance.payments.approve') && (
                                                <button onClick={() => setCancelId(p.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-sm">السابق</button>
                    <span className="flex items-center px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-sm">التالي</button>
                </div>
            )}

            {/* Create Payment Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
                    <div className="edara-card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >تسجيل سداد جديد</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="form-label">المورد *</label>
                                <select name="supplier_id" className="form-input" required onChange={e => {
                                    const sup = suppliers.find(s => s.id === e.target.value)
                                    setSelectedSupplierBalance(sup ? sup.current_balance : null)
                                    // Auto-fill amount with outstanding balance
                                    if (sup && sup.current_balance > 0) {
                                        const amountInput = e.target.form?.querySelector('[name="amount"]') as HTMLInputElement | null
                                        if (amountInput) amountInput.value = String(sup.current_balance)
                                    }
                                }}>
                                    <option value="">— اختر المورد —</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                                </select>
                                {selectedSupplierBalance !== null && (
                                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                        رصيد المورد: <b style={{ color: selectedSupplierBalance > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{formatCurrency(selectedSupplierBalance)}</b>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="form-label">المبلغ *</label>
                                <input name="amount" type="number" min="0.01" step="0.01" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">طريقة الدفع *</label>
                                <select name="payment_method" className="form-input" required>
                                    {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethodType, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">من خزنة *</label>
                                <select name="vault_id" className="form-input" required>
                                    <option value="">— اختر الخزنة —</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">ملاحظات</label>
                                <textarea name="notes" rows={2} className="form-input" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'تسجيل'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!cancelId} title="إلغاء السداد" message="هل أنت متأكد من إلغاء هذا السداد؟ سيؤثر على رصيد المورد والخزنة."
                onConfirm={() => cancelId && handleCancel(cancelId)} onCancel={() => setCancelId(null)} />
        </div>
    )
}
