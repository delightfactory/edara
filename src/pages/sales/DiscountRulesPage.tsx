import { useState, useEffect, useCallback, useRef } from 'react'
import { Tag, Plus, Search, Filter, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getDiscountRules, createDiscountRule, updateDiscountRule, deleteDiscountRule } from '@/lib/services/sales'
import type { DiscountRule, DiscountRuleInput, DiscountRuleFilters, DiscountType, DiscountScope } from '@/lib/types/sales'
import { DISCOUNT_TYPE_LABELS, DISCOUNT_SCOPE_LABELS } from '@/lib/types/sales'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function DiscountRulesPage() {
    usePageTitle('قواعد الخصم')
    const { can, profile } = useAuthStore()

    const [rules, setRules] = useState<DiscountRule[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize] = useState(25)

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterType, setFilterType] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<DiscountRule | null>(null)
    const [saving, setSaving] = useState(false)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const totalPages = Math.ceil(total / pageSize)

    const loadRules = useCallback(async () => {
        setLoading(true)
        try {
            const filters: DiscountRuleFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                type: (filterType as DiscountType) || undefined,
            }
            const result = await getDiscountRules(filters)
            setRules(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل القواعد')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterType])

    useEffect(() => { loadRules() }, [loadRules])

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data: DiscountRuleInput = {
            name: form.get('name') as string,
            type: form.get('type') as DiscountType,
            scope: form.get('scope') as DiscountScope,
            scope_id: (form.get('scope_id') as string) || null,
            value: Number(form.get('value')),
            is_percentage: form.get('is_percentage') === 'true',
            min_qty: form.get('min_qty') ? Number(form.get('min_qty')) : null,
            max_qty: form.get('max_qty') ? Number(form.get('max_qty')) : null,
            start_date: (form.get('start_date') as string) || null,
            end_date: (form.get('end_date') as string) || null,
            is_active: form.get('is_active') === 'true',
        }

        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم القاعدة'); return }
        setSaving(true)
        try {
            if (editing) {
                await updateDiscountRule(editing.id, data)
                toast.success('تم تحديث القاعدة')
            } else {
                await createDiscountRule(data, [], profile?.id)
                toast.success('تم إنشاء القاعدة')
            }
            setShowForm(false)
            setEditing(null)
            loadRules()
        } catch {
            toast.error('فشل الحفظ')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteDiscountRule(id)
            toast.success('تم حذف القاعدة')
            loadRules()
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Tag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">قواعد الخصم</h1>
                        <p className="page-subtitle">{total} قاعدة</p>
                    </div>
                </div>
                {can('sales.discounts.manage') && (
                    <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة قاعدة
                    </button>
                )}
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
                        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الأنواع</option>
                            {(Object.entries(DISCOUNT_TYPE_LABELS) as [DiscountType, string][]).map(([val, label]) => (
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

            <div className="edara-card overflow-x-auto">
                <table className="data-table" style={{ minWidth: '700px' }}>
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>النوع</th>
                            <th>النطاق</th>
                            <th>القيمة</th>
                            <th>الفترة</th>
                            <th>الحالة</th>
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
                        ) : rules.length === 0 ? (
                            <tr><td colSpan={7} className="data-table-empty">لا توجد قواعد خصم</td></tr>
                        ) : rules.map(r => (
                            <tr key={r.id}>
                                <td>{r.name}</td>
                                <td><span className="badge badge-secondary">{DISCOUNT_TYPE_LABELS[r.type]}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{DISCOUNT_SCOPE_LABELS[r.scope]}</td>
                                <td>{r.value}{r.is_percentage ? '%' : ' ج.م'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>
                                    {r.start_date ? new Date(r.start_date).toLocaleDateString('ar-EG') : '—'}
                                    {r.end_date ? ` — ${new Date(r.end_date).toLocaleDateString('ar-EG')}` : ''}
                                </td>
                                <td><span className={`badge ${r.is_active ? 'badge-success' : 'badge-secondary'}`}>{r.is_active ? 'نشط' : 'غير نشط'}</span></td>
                                <td>
                                    {can('sales.discounts.manage') && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setEditing(r); setShowForm(true) }} className="btn btn-ghost text-xs">تعديل</button>
                                            <button onClick={() => setConfirmId(r.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>حذف</button>
                                        </div>
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

            <ConfirmDialog open={!!confirmId} title="حذف القاعدة" message="هل أنت متأكد من حذف هذه القاعدة؟"
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {/* Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
                    <div className="edara-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editing ? 'تعديل القاعدة' : 'إضافة قاعدة خصم'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="form-label">الاسم *</label>
                                <input name="name" defaultValue={editing?.name || ''} className="form-input" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">النوع *</label>
                                    <select name="type" defaultValue={editing?.type || 'product'} className="form-input">
                                        {(Object.entries(DISCOUNT_TYPE_LABELS) as [DiscountType, string][]).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">النطاق *</label>
                                    <select name="scope" defaultValue={editing?.scope || 'company'} className="form-input">
                                        {(Object.entries(DISCOUNT_SCOPE_LABELS) as [DiscountScope, string][]).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">القيمة *</label>
                                    <input name="value" type="number" min="0" step="0.01" defaultValue={editing?.value || ''} className="form-input" required />
                                </div>
                                <div>
                                    <label className="form-label">نوع القيمة</label>
                                    <select name="is_percentage" defaultValue={editing?.is_percentage ? 'true' : 'false'} className="form-input">
                                        <option value="true">نسبة مئوية %</option>
                                        <option value="false">مبلغ ثابت</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">من تاريخ</label>
                                    <input name="start_date" type="date" defaultValue={editing?.start_date || ''} className="form-input" />
                                </div>
                                <div>
                                    <label className="form-label">إلى تاريخ</label>
                                    <input name="end_date" type="date" defaultValue={editing?.end_date || ''} className="form-input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">حد أدنى كمية</label>
                                    <input name="min_qty" type="number" min="0" defaultValue={editing?.min_qty || ''} className="form-input" />
                                </div>
                                <div>
                                    <label className="form-label">حد أقصى كمية</label>
                                    <input name="max_qty" type="number" min="0" defaultValue={editing?.max_qty || ''} className="form-input" />
                                </div>
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
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'حفظ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
