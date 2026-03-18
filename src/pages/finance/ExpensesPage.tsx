import { useState, useEffect, useCallback, useRef } from 'react'
import { Receipt, Plus, Search, Filter, X, CheckCircle, XCircle, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getExpenses, createExpense, approveExpense, rejectExpense, getExpenseCategories } from '@/lib/services/finance'
import { getActiveVaults, getActiveCustodyAccounts } from '@/lib/services/finance'
import { getActiveBranches } from '@/lib/services/geography'
import type { ExpenseWithRefs, ExpenseInput, ExpenseFilters, ExpenseStatus } from '@/lib/types/finance'
import type { ExpenseCategory } from '@/lib/types/finance'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS } from '@/lib/types/finance'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function ExpensesPage() {
    usePageTitle('المصروفات')
    const { can, profile } = useAuthStore()

    const [expenses, setExpenses] = useState<ExpenseWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Lookups
    const [categories, setCategories] = useState<ExpenseCategory[]>([])
    const [vaults, setVaults] = useState<{ id: string; name: string; type: string }[]>([])
    const [custodyAccounts, setCustodyAccounts] = useState<{ id: string; employee: any; current_balance: number }[]>([])
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterStatus, setFilterStatus] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    // Form
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)

    // Reject
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [rejecting, setRejecting] = useState(false)

    // Approve confirm
    const [approveId, setApproveId] = useState<string | null>(null)

    // Date filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        Promise.all([
            getExpenseCategories(),
            getActiveVaults(),
            getActiveCustodyAccounts(),
            getActiveBranches(),
        ]).then(([cats, v, c, b]) => {
            setCategories(cats)
            setVaults(v)
            setCustodyAccounts(c)
            setBranches(b)
        }).catch(() => { })
    }, [])

    const loadExpenses = useCallback(async () => {
        setLoading(true)
        try {
            const filters: ExpenseFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as ExpenseStatus) || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            }
            const result = await getExpenses(filters)
            setExpenses(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل المصروفات')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus, dateFrom, dateTo])

    useEffect(() => { loadExpenses() }, [loadExpenses])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data: ExpenseInput = {
            category_id: (form.get('category_id') as string) || null,
            amount: Number(form.get('amount')),
            vault_id: (form.get('vault_id') as string) || null,
            custody_id: (form.get('custody_id') as string) || null,
            description: (form.get('description') as string) || null,
            receipt_url: null,
            expense_date: form.get('expense_date') as string,
            branch_id: (form.get('branch_id') as string) || null,
        }

        if (!data.amount || data.amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return }
        if (!data.vault_id && !data.custody_id) { toast.error('يرجى تحديد الخزنة أو العهدة'); return }

        setSaving(true)
        try {
            await createExpense(data, profile?.id || '')
            toast.success('تم تسجيل المصروف بنجاح')
            setShowForm(false)
            loadExpenses()
        } catch {
            toast.error('فشل تسجيل المصروف')
        } finally {
            setSaving(false)
        }
    }

    const handleApprove = async (id: string) => {
        setApproveId(null)
        try {
            await approveExpense(id, profile?.id || '')
            toast.success('تم اعتماد المصروف')
            loadExpenses()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل اعتماد المصروف')
        }
    }

    const handleReject = async () => {
        if (!rejectId) return
        if (!rejectReason.trim()) { toast.error('يرجى إدخال سبب الرفض'); return }
        setRejecting(true)
        try {
            await rejectExpense(rejectId, profile?.id || '', rejectReason)
            toast.success('تم رفض المصروف')
            setRejectId(null)
            setRejectReason('')
            loadExpenses()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل رفض المصروف')
        } finally {
            setRejecting(false)
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">المصروفات</h1>
                        <p className="page-subtitle">{total} مصروف</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        const rows = expenses.map(exp => ({
                            'الرقم': exp.expense_number,
                            'التاريخ': exp.expense_date,
                            'الفئة': exp.category?.name || '',
                            'المبلغ': exp.amount,
                            'المصدر': exp.vault?.name || 'عهدة',
                            'الحالة': EXPENSE_STATUS_LABELS[exp.status] || exp.status,
                        }))
                        const csv = '\uFEFF' + Object.keys(rows[0] || {}).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'المصروفات.csv'; a.click()
                    }} className="btn btn-secondary" title="تصدير CSV">
                        <Download className="h-4 w-4" />
                    </button>
                    {can('finance.expenses.create') && (
                        <button onClick={() => setShowForm(true)} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> تسجيل مصروف
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث برقم المصروف أو الوصف..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '10rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(EXPENSE_STATUS_LABELS) as [ExpenseStatus, string][]).map(([val, label]) => (
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
                            <th>الفئة</th>
                            <th>المبلغ</th>
                            <th>المصدر</th>
                            <th>الفرع</th>
                            <th>طالب الصرف</th>
                            <th>المعتمد</th>
                            <th>الحالة</th>
                            <th>الوصف</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={11} className="data-table-empty">جارٍ التحميل...</td></tr>
                        ) : expenses.length === 0 ? (
                            <tr><td colSpan={11} className="data-table-empty">لا توجد مصروفات</td></tr>
                        ) : expenses.map(exp => (
                            <tr key={exp.id}>
                                <td className="font-mono text-sm" >{exp.expense_number}</td>
                                <td >{new Date(exp.expense_date).toLocaleDateString('ar-EG')}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{exp.category?.name || '—'}</td>
                                <td className="font-semibold" >{formatCurrency(exp.amount)}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{exp.vault?.name || exp.custody?.employee?.profile?.full_name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{exp.branch?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{exp.requester?.full_name || '—'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{exp.approver?.full_name || '—'}</td>
                                <td><span className={`badge ${EXPENSE_STATUS_COLORS[exp.status]}`}>{EXPENSE_STATUS_LABELS[exp.status]}</span></td>
                                <td className="max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>{exp.description || '—'}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        {(exp.status === 'draft' || exp.status === 'pending_approval') && can('finance.expenses.approve') && (
                                            <button onClick={() => setApproveId(exp.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-success)' }}>
                                                <CheckCircle className="h-3.5 w-3.5" /> اعتماد
                                            </button>
                                        )}
                                        {(exp.status === 'draft' || exp.status === 'pending_approval') && can('finance.expenses.approve') && (
                                            <button onClick={() => setRejectId(exp.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>
                                                <XCircle className="h-3.5 w-3.5" /> رفض
                                            </button>
                                        )}
                                        {exp.status === 'rejected' && exp.rejection_reason && (
                                            <span className="text-xs" style={{ color: 'var(--color-danger)' }} title={exp.rejection_reason}>سبب: {exp.rejection_reason.substring(0, 20)}...</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {expenses.length > 0 && (
                        <tfoot>
                            <tr >
                                <td colSpan={3} className="font-bold text-sm" >الإجمالي</td>
                                <td className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</td>
                                <td colSpan={7}></td>
                            </tr>
                        </tfoot>
                    )}
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

            {/* Create Expense Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
                    <div className="edara-card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >تسجيل مصروف جديد</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="form-label">المبلغ *</label>
                                <input name="amount" type="number" min="0.01" step="0.01" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">الفئة</label>
                                <select name="category_id" className="form-input">
                                    <option value="">— بدون —</option>
                                    {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">من خزنة</label>
                                <select name="vault_id" className="form-input" onChange={e => {
                                    if (e.target.value) {
                                        const custSelect = e.target.form?.querySelector('[name="custody_id"]') as HTMLSelectElement | null
                                        if (custSelect) custSelect.value = ''
                                    }
                                }}>
                                    <option value="">— اختر —</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">أو من عهدة</label>
                                <select name="custody_id" className="form-input" onChange={e => {
                                    if (e.target.value) {
                                        const vaultSelect = e.target.form?.querySelector('[name="vault_id"]') as HTMLSelectElement | null
                                        if (vaultSelect) vaultSelect.value = ''
                                    }
                                }}>
                                    <option value="">— اختر —</option>
                                    {custodyAccounts.map(c => <option key={c.id} value={c.id}>{c.employee?.profile?.full_name || '—'}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">التاريخ *</label>
                                <input name="expense_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">الوصف</label>
                                <textarea name="description" rows={2} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">الفرع</label>
                                <select name="branch_id" className="form-input">
                                    <option value="">— بدون —</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Dialog */}
            {rejectId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setRejectId(null)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >رفض المصروف</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">سبب الرفض *</label>
                                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="form-input" rows={3} placeholder="أدخل سبب الرفض..." />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setRejectId(null); setRejectReason('') }} className="btn btn-secondary">تراجع</button>
                                <button onClick={handleReject} disabled={rejecting} className="btn btn-primary" style={{ background: 'var(--color-danger)' }}>
                                    {rejecting ? 'جارٍ...' : 'تأكيد الرفض'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!approveId} title="اعتماد المصروف" message="هل أنت متأكد من اعتماد هذا المصروف؟ سيتم خصم المبلغ من الخزنة/العهدة."
                onConfirm={() => approveId && handleApprove(approveId)} onCancel={() => setApproveId(null)} />
        </div>
    )
}
