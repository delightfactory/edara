import { useState, useEffect, useCallback, useRef } from 'react'
import { Landmark, Plus, Search, Filter, X, ArrowRightLeft, Eye, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getVaults, createVault, updateVault, deleteVault, getVaultTransactions, transferBetweenVaults, vaultDeposit, vaultWithdraw } from '@/lib/services/finance'
import { getActiveBranches } from '@/lib/services/geography'
import { getProfileLookups } from '@/lib/services/inventory'
import type { VaultWithRefs, VaultInput, VaultFilters, VaultType, VaultTransactionWithRefs, VaultTransactionFilters } from '@/lib/types/finance'
import { VAULT_TYPE_LABELS, VAULT_TRANSACTION_TYPE_LABELS } from '@/lib/types/finance'
import type { ProfileLookup } from '@/lib/types/inventory'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function VaultsPage() {
    usePageTitle('الخزائن')
    const { can, profile } = useAuthStore()

    // Data
    const [vaults, setVaults] = useState<VaultWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Lookups
    const [profiles, setProfiles] = useState<ProfileLookup[]>([])
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterType, setFilterType] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<VaultWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // Transfer
    const [showTransfer, setShowTransfer] = useState(false)
    const [transferFrom, setTransferFrom] = useState('')
    const [transferTo, setTransferTo] = useState('')
    const [transferAmount, setTransferAmount] = useState('')

    // Vault detail
    const [selectedVault, setSelectedVault] = useState<VaultWithRefs | null>(null)
    const [transactions, setTransactions] = useState<VaultTransactionWithRefs[]>([])
    const [txLoading, setTxLoading] = useState(false)

    // Deposit/Withdraw
    const [showDepositWithdraw, setShowDepositWithdraw] = useState<'deposit' | 'withdraw' | null>(null)
    const [dwVaultId, setDwVaultId] = useState('')
    const [dwAmount, setDwAmount] = useState('')
    const [dwDescription, setDwDescription] = useState('')

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        Promise.all([getProfileLookups(), getActiveBranches()]).then(([p, b]) => {
            setProfiles(p)
            setBranches(b)
        }).catch(() => { })
    }, [])

    const loadVaults = useCallback(async () => {
        setLoading(true)
        try {
            const filters: VaultFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                type: (filterType as VaultType) || undefined,
            }
            const result = await getVaults(filters)
            setVaults(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل الخزائن')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterType])

    useEffect(() => { loadVaults() }, [loadVaults])

    const loadTransactions = async (vault: VaultWithRefs) => {
        setSelectedVault(vault)
        setTxLoading(true)
        try {
            const filters: VaultTransactionFilters = { vault_id: vault.id, pageSize: 50 }
            const result = await getVaultTransactions(filters)
            setTransactions(result.data)
        } catch {
            toast.error('حدث خطأ في تحميل الحركات')
        } finally {
            setTxLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data: Partial<VaultInput> = {
            name: form.get('name') as string,
            type: form.get('type') as VaultType,
            account_number: (form.get('account_number') as string) || null,
            bank_name: (form.get('bank_name') as string) || null,
            responsible_id: (form.get('responsible_id') as string) || null,
            branch_id: (form.get('branch_id') as string) || null,
            is_active: form.get('is_active') === 'true',
        }

        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم الخزنة'); return }
        setSaving(true)
        try {
            if (editing) {
                await updateVault(editing.id, data)
                toast.success('تم تحديث الخزنة')
            } else {
                data.current_balance = 0
                await createVault(data)
                toast.success('تم إنشاء الخزنة')
            }
            setShowForm(false)
            setEditing(null)
            loadVaults()
        } catch {
            toast.error(editing ? 'فشل تحديث الخزنة' : 'فشل إنشاء الخزنة')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteVault(id)
            toast.success('تم حذف الخزنة')
            loadVaults()
        } catch {
            toast.error('فشل الحذف — قد تكون مرتبطة بحركات')
        } finally {
            setDeleting(null)
        }
    }

    const handleTransfer = async () => {
        if (!transferFrom || !transferTo || !transferAmount || Number(transferAmount) <= 0) {
            toast.error('يرجى ملء كل بيانات التحويل'); return
        }
        if (transferFrom === transferTo) {
            toast.error('لا يمكن التحويل لنفس الخزنة'); return
        }
        setSaving(true)
        try {
            await transferBetweenVaults(transferFrom, transferTo, Number(transferAmount), profile?.id || '')
            toast.success('تم التحويل بنجاح')
            setShowTransfer(false)
            setTransferFrom(''); setTransferTo(''); setTransferAmount('')
            loadVaults()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل التحويل')
        } finally {
            setSaving(false)
        }
    }

    const handleDepositWithdraw = async () => {
        if (!dwVaultId || !dwAmount || Number(dwAmount) <= 0) {
            toast.error('يرجى اختيار الخزنة وإدخال مبلغ صحيح'); return
        }
        setSaving(true)
        try {
            if (showDepositWithdraw === 'deposit') {
                await vaultDeposit(dwVaultId, Number(dwAmount), dwDescription, profile?.id || '')
                toast.success('تم الإيداع بنجاح')
            } else {
                await vaultWithdraw(dwVaultId, Number(dwAmount), dwDescription, profile?.id || '')
                toast.success('تم السحب بنجاح')
            }
            setShowDepositWithdraw(null)
            setDwVaultId(''); setDwAmount(''); setDwDescription('')
            loadVaults()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشلت العملية')
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Landmark className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">الخزائن</h1>
                        <p className="page-subtitle">{total} خزنة/حساب</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {can('finance.vaults.create') && (
                        <button onClick={() => setShowDepositWithdraw('deposit')} className="btn btn-secondary">
                            <ArrowDownToLine className="h-4 w-4" /> إيداع
                        </button>
                    )}
                    {can('finance.vaults.create') && (
                        <button onClick={() => setShowDepositWithdraw('withdraw')} className="btn btn-secondary">
                            <ArrowUpFromLine className="h-4 w-4" /> سحب
                        </button>
                    )}
                    {can('finance.vaults.create') && (
                        <button onClick={() => setShowTransfer(true)} className="btn btn-secondary">
                            <ArrowRightLeft className="h-4 w-4" /> تحويل
                        </button>
                    )}
                    {can('finance.vaults.create') && (
                        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> إضافة خزنة
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث بالاسم..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الأنواع</option>
                            {(Object.entries(VAULT_TYPE_LABELS) as [VaultType, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {(search || filterType) && (
                        <button onClick={() => { setSearch(''); setFilterType(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح
                        </button>
                    )}
                </div>
            </div>

            {/* Vault Cards */}
            {loading ? (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
            ) : vaults.length === 0 ? (
                <div className="edara-card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد خزائن</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vaults.map(v => (
                        <div key={v.id} className="edara-card p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => loadTransactions(v)}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold" >{v.name}</h3>
                                <span className={`badge ${v.is_active ? 'badge-success' : 'badge-secondary'}`}>{v.is_active ? 'نشط' : 'غير نشط'}</span>
                            </div>
                            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{VAULT_TYPE_LABELS[v.type]}</p>
                            {v.branch && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>فرع: {v.branch.name}</p>}
                            <div className="text-2xl font-bold" style={{ color: v.current_balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {formatCurrency(v.current_balance)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>ج.م</span>
                            </div>
                            {v.responsible && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>المسؤول: {v.responsible.full_name}</p>}
                            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                                <button onClick={e => { e.stopPropagation(); loadTransactions(v) }} className="btn btn-ghost text-xs">
                                    <Eye className="h-3.5 w-3.5" /> الحركات
                                </button>
                                {can('finance.vaults.create') && (
                                    <button onClick={e => { e.stopPropagation(); setEditing(v); setShowForm(true) }} className="btn btn-ghost text-xs">تعديل</button>
                                )}
                                {can('finance.vaults.create') && (
                                    <button onClick={e => { e.stopPropagation(); setConfirmId(v.id) }} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>حذف</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-sm">السابق</button>
                    <span className="flex items-center px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-sm">التالي</button>
                </div>
            )}

            {/* Vault Transactions Modal */}
            {selectedVault && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedVault(null)}>
                    <div className="edara-card w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" >حركات: {selectedVault.name}</h2>
                            <button onClick={() => setSelectedVault(null)} className="btn btn-ghost"><X className="h-5 w-5" /></button>
                        </div>
                        {txLoading ? (
                            <div className="data-table-empty">جارٍ التحميل...</div>
                        ) : transactions.length === 0 ? (
                            <div className="data-table-empty">لا توجد حركات</div>
                        ) : (
                            <div className="overflow-x-auto">
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
                                                <td><span className="badge badge-secondary">{VAULT_TRANSACTION_TYPE_LABELS[tx.type]}</span></td>
                                                <td style={{ color: tx.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }} className="font-semibold">{formatCurrency(tx.amount)}</td>
                                                <td >{formatCurrency(tx.balance_after)}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{tx.description || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create/Edit Vault Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
                    <div className="edara-card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >{editing ? 'تعديل الخزنة' : 'إضافة خزنة'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="form-label">اسم الخزنة *</label>
                                <input name="name" defaultValue={editing?.name || ''} className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">النوع *</label>
                                <select name="type" defaultValue={editing?.type || 'cash'} className="form-input">
                                    {(Object.entries(VAULT_TYPE_LABELS) as [VaultType, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">رقم الحساب</label>
                                <input name="account_number" defaultValue={editing?.account_number || ''} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">اسم البنك</label>
                                <input name="bank_name" defaultValue={editing?.bank_name || ''} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">المسؤول</label>
                                <select name="responsible_id" defaultValue={editing?.responsible_id || ''} className="form-input">
                                    <option value="">— بدون —</option>
                                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">الفرع</label>
                                <select name="branch_id" defaultValue={editing?.branch_id || ''} className="form-input">
                                    <option value="">— بدون —</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">الحالة</label>
                                <select name="is_active" defaultValue={editing?.is_active !== false ? 'true' : 'false'} className="form-input">
                                    <option value="true">نشط</option>
                                    <option value="false">غير نشط</option>
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

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowTransfer(false)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >تحويل بين الخزائن</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">من خزنة *</label>
                                <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} className="form-input">
                                    <option value="">— اختر —</option>
                                    {vaults.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name} ({formatCurrency(v.current_balance)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">إلى خزنة *</label>
                                <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className="form-input">
                                    <option value="">— اختر —</option>
                                    {vaults.filter(v => v.is_active && v.id !== transferFrom).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">المبلغ *</label>
                                <input type="number" min="0.01" step="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="form-input" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowTransfer(false)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleTransfer} disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'تحويل'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!confirmId} title="حذف الخزنة" message="هل أنت متأكد من حذف هذه الخزنة؟"
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {/* Deposit/Withdraw Modal */}
            {showDepositWithdraw && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDepositWithdraw(null)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" >
                            {showDepositWithdraw === 'deposit' ? 'إيداع في خزنة' : 'سحب من خزنة'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">الخزنة *</label>
                                <select value={dwVaultId} onChange={e => setDwVaultId(e.target.value)} className="form-input">
                                    <option value="">— اختر —</option>
                                    {vaults.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name} ({formatCurrency(v.current_balance)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">المبلغ *</label>
                                <input type="number" min="0.01" step="0.01" value={dwAmount} onChange={e => setDwAmount(e.target.value)} className="form-input" dir="ltr" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="form-label">الوصف</label>
                                <input type="text" value={dwDescription} onChange={e => setDwDescription(e.target.value)} className="form-input"
                                    placeholder={showDepositWithdraw === 'deposit' ? 'مثال: إيداع رأس مال...' : 'مثال: سحب للمصروفات...'} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowDepositWithdraw(null)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleDepositWithdraw} disabled={saving} className={`btn ${showDepositWithdraw === 'deposit' ? 'btn-primary' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                                    {saving ? 'جارٍ...' : showDepositWithdraw === 'deposit' ? 'إيداع' : 'سحب'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
