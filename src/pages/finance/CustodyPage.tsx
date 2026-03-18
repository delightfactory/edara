import { useState, useEffect, useCallback } from 'react'
import { Wallet, Search, X, Plus, ArrowDownToLine } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCustodyAccounts, getCustodyTransactions, settleCustody, getActiveVaults, createCustodyAccount, loadCustodyBalance } from '@/lib/services/finance'
import { getEmployees } from '@/lib/services/hr'
import type { CustodyAccountWithRefs, CustodyFilters, CustodyTransactionWithRefs, CustodyTransactionFilters } from '@/lib/types/finance'
import { CUSTODY_TRANSACTION_TYPE_LABELS } from '@/lib/types/finance'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function CustodyPage() {
    usePageTitle('العهد')
    const { can, profile } = useAuthStore()

    const [accounts, setAccounts] = useState<CustodyAccountWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)

    // Detail
    const [selectedAccount, setSelectedAccount] = useState<CustodyAccountWithRefs | null>(null)
    const [transactions, setTransactions] = useState<CustodyTransactionWithRefs[]>([])
    const [txLoading, setTxLoading] = useState(false)

    // Settle
    const [showSettle, setShowSettle] = useState(false)
    const [settleVaultId, setSettleVaultId] = useState('')
    const [vaults, setVaults] = useState<{ id: string; name: string; type: string }[]>([])
    const [saving, setSaving] = useState(false)

    // Create
    const [showCreate, setShowCreate] = useState(false)
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
    const [createEmployeeId, setCreateEmployeeId] = useState('')
    const [createMaxBalance, setCreateMaxBalance] = useState(10000)

    // Load Balance
    const [showLoad, setShowLoad] = useState(false)
    const [loadVaultId, setLoadVaultId] = useState('')
    const [loadAmount, setLoadAmount] = useState(0)
    const [loadDesc, setLoadDesc] = useState('')

    const totalPages = Math.ceil(total / 25)

    useEffect(() => {
        getActiveVaults().then(setVaults).catch(() => { })
        getEmployees({ pageSize: 200 }).then(result => {
            setEmployees((result.data || []).map((e: any) => ({ id: e.id, name: e.profile?.full_name || e.id })))
        }).catch(() => { })
    }, [])

    const loadAccounts = useCallback(async () => {
        setLoading(true)
        try {
            const filters: CustodyFilters = { page, pageSize: 25, search: debouncedSearch || undefined }
            const result = await getCustodyAccounts(filters)
            setAccounts(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل حسابات العهد')
        } finally {
            setLoading(false)
        }
    }, [page, debouncedSearch])

    useEffect(() => { loadAccounts() }, [loadAccounts])

    const loadTransactions = async (account: CustodyAccountWithRefs) => {
        setSelectedAccount(account)
        setTxLoading(true)
        try {
            const filters: CustodyTransactionFilters = { custody_id: account.id, pageSize: 50 }
            const result = await getCustodyTransactions(filters)
            setTransactions(result.data)
        } catch {
            toast.error('حدث خطأ في تحميل الحركات')
        } finally {
            setTxLoading(false)
        }
    }

    const handleSettle = async () => {
        if (!selectedAccount || !settleVaultId) { toast.error('يرجى اختيار الخزنة'); return }
        setSaving(true)
        try {
            await settleCustody(selectedAccount.id, settleVaultId, profile?.id || '')
            toast.success('تم تسوية العهدة')
            setShowSettle(false)
            setSelectedAccount(null)
            loadAccounts()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل التسوية')
        } finally {
            setSaving(false)
        }
    }

    const handleCreate = async () => {
        if (!createEmployeeId) { toast.error('يرجى اختيار الموظف'); return }
        setSaving(true)
        try {
            await createCustodyAccount(createEmployeeId, createMaxBalance)
            toast.success('تم إنشاء حساب العهدة')
            setShowCreate(false)
            setCreateEmployeeId(''); setCreateMaxBalance(10000)
            loadAccounts()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل إنشاء العهدة')
        } finally { setSaving(false) }
    }

    const handleLoad = async () => {
        if (!selectedAccount || !loadVaultId || loadAmount <= 0) { toast.error('يرجى ملء جميع البيانات'); return }
        setSaving(true)
        try {
            await loadCustodyBalance(selectedAccount.id, loadVaultId, loadAmount, loadDesc, profile?.id || '')
            toast.success('تم تحميل الرصيد بنجاح')
            setShowLoad(false); setSelectedAccount(null)
            setLoadVaultId(''); setLoadAmount(0); setLoadDesc('')
            loadAccounts()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل تحميل الرصيد')
        } finally { setSaving(false) }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Wallet className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">إدارة العهد</h1>
                        <p className="page-subtitle">{total} عهدة</p>
                    </div>
                </div>
                {can('finance.custody.manage') && (
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إنشاء عهدة
                    </button>
                )}
            </div>

            <div className="edara-card p-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="بحث بالاسم..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                </div>
            </div>

            {/* Cards */}
            {loading ? (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
            ) : accounts.length === 0 ? (
                <div className="edara-card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد حسابات عهد</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map(acc => (
                        <div key={acc.id} className="edara-card p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => loadTransactions(acc)}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold" >{acc.employee?.profile?.full_name || '—'}</h3>
                                <span className={`badge ${acc.is_active ? 'badge-success' : 'badge-secondary'}`}>{acc.is_active ? 'نشط' : 'غير نشط'}</span>
                            </div>
                            <div className="text-2xl font-bold mb-1" style={{ color: acc.current_balance > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                {formatCurrency(acc.current_balance)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>ج.م</span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>الحد الأقصى: {formatCurrency(acc.max_balance)}</p>
                            {can('finance.custody.settle') && acc.current_balance > 0 && (
                                <button onClick={e => { e.stopPropagation(); setSelectedAccount(acc); setShowSettle(true) }}
                                    className="btn btn-secondary text-xs mt-3 flex-1">تسوية</button>
                            )}
                            {can('finance.custody.manage') && (
                                <button onClick={e => { e.stopPropagation(); setSelectedAccount(acc); setShowLoad(true) }}
                                    className="btn btn-primary text-xs mt-3 flex-1 gap-1">
                                    <ArrowDownToLine className="h-3 w-3" /> تحميل رصيد
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-sm">السابق</button>
                    <span className="flex items-center px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-sm">التالي</button>
                </div>
            )}

            {/* Transactions Modal */}
            {selectedAccount && !showSettle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedAccount(null)}>
                    <div className="edara-card w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" >حركات عهدة: {selectedAccount.employee?.profile?.full_name}</h2>
                            <button onClick={() => setSelectedAccount(null)} className="btn btn-ghost"><X className="h-5 w-5" /></button>
                        </div>
                        {txLoading ? (
                            <div className="data-table-empty">جارٍ التحميل...</div>
                        ) : transactions.length === 0 ? (
                            <div className="data-table-empty">لا توجد حركات</div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>النوع</th>
                                        <th>المبلغ</th>
                                        <th>الرصيد بعد</th>
                                        <th>الوصف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td >{new Date(tx.created_at).toLocaleDateString('ar-EG')}</td>
                                            <td><span className="badge badge-secondary">{CUSTODY_TRANSACTION_TYPE_LABELS[tx.type]}</span></td>
                                            <td className="font-semibold" style={{ color: tx.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatCurrency(tx.amount)}</td>
                                            <td >{formatCurrency(tx.balance_after)}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{tx.description || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Settle Modal */}
            {showSettle && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSettle(false)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >تسوية عهدة: {selectedAccount.employee?.profile?.full_name}</h2>
                        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>الرصيد الحالي: <strong>{formatCurrency(selectedAccount.current_balance)}</strong></p>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">إلى خزنة *</label>
                                <select value={settleVaultId} onChange={e => setSettleVaultId(e.target.value)} className="form-input">
                                    <option value="">— اختر الخزنة —</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowSettle(false)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleSettle} disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'تسوية'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Custody Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCreate(false)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >إنشاء حساب عهدة جديد</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">الموظف *</label>
                                <select value={createEmployeeId} onChange={e => setCreateEmployeeId(e.target.value)} className="form-input">
                                    <option value="">— اختر الموظف —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">الحد الأقصى للعهدة</label>
                                <input type="number" min="0" value={createMaxBalance} onChange={e => setCreateMaxBalance(Number(e.target.value))} className="form-input" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowCreate(false)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleCreate} disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'إنشاء'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Balance Modal */}
            {showLoad && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowLoad(false)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >تحميل رصيد: {selectedAccount.employee?.profile?.full_name}</h2>
                        <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>الرصيد الحالي: <strong>{formatCurrency(selectedAccount.current_balance)}</strong> | الحد: <strong>{formatCurrency(selectedAccount.max_balance)}</strong></p>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">من خزنة *</label>
                                <select value={loadVaultId} onChange={e => setLoadVaultId(e.target.value)} className="form-input">
                                    <option value="">— اختر الخزنة —</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">المبلغ *</label>
                                <input type="number" min="0.01" step="0.01" value={loadAmount || ''} onChange={e => setLoadAmount(Number(e.target.value))} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">وصف</label>
                                <input type="text" value={loadDesc} onChange={e => setLoadDesc(e.target.value)} className="form-input" placeholder="وصف اختياري..." />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowLoad(false)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleLoad} disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'تحميل'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
