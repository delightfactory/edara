import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, Plus, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getBranches, createBranch, updateBranch, deleteBranch } from '@/lib/services/geography'
import type { BranchWithRefs, BranchInput, BranchFilters } from '@/lib/types/geography'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function BranchesPage() {
    usePageTitle('الفروع')
    const { can } = useAuthStore()

    const [branches, setBranches] = useState<BranchWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize] = useState(25)

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const searchRef = useRef<HTMLInputElement>(null)

    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<BranchWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const totalPages = Math.ceil(total / pageSize)

    const loadBranches = useCallback(async () => {
        setLoading(true)
        try {
            const filters: BranchFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
            }
            const result = await getBranches(filters)
            setBranches(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل الفروع')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch])

    useEffect(() => { loadBranches() }, [loadBranches])

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data: Partial<BranchInput> = {
            name: form.get('name') as string,
            address: (form.get('address') as string) || null,
            phone: (form.get('phone') as string) || null,
            is_active: form.get('is_active') === 'true',
        }

        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم الفرع'); return }
        setSaving(true)
        try {
            if (editing) {
                await updateBranch(editing.id, data)
                toast.success('تم تحديث الفرع')
            } else {
                await createBranch(data)
                toast.success('تم إنشاء الفرع')
            }
            setShowForm(false)
            setEditing(null)
            loadBranches()
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
            await deleteBranch(id)
            toast.success('تم حذف الفرع')
            loadBranches()
        } catch {
            toast.error('فشل الحذف — قد يكون مرتبطاً ببيانات')
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">الفروع</h1>
                        <p className="page-subtitle">{total} فرع</p>
                    </div>
                </div>
                {can('settings.general.read') && (
                    <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة فرع
                    </button>
                )}
            </div>

            <div className="edara-card p-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input ref={searchRef} type="text" placeholder="بحث بالاسم أو الكود..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
            ) : branches.length === 0 ? (
                <div className="edara-card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد فروع</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branches.map(b => (
                        <div key={b.id} className="edara-card p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</h3>
                                <span className={`badge ${b.is_active ? 'badge-success' : 'badge-secondary'}`}>{b.is_active ? 'نشط' : 'غير نشط'}</span>
                            </div>
                            {b.address && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{b.address}</p>}
                            {b.phone && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>📞 {b.phone}</p>}
                            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                                <button onClick={() => { setEditing(b); setShowForm(true) }} className="btn btn-ghost text-xs">تعديل</button>
                                <button onClick={() => setConfirmId(b.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>حذف</button>
                            </div>
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

            <ConfirmDialog open={!!confirmId} title="حذف الفرع" message="هل أنت متأكد من حذف هذا الفرع؟"
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {/* Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editing ? 'تعديل الفرع' : 'إضافة فرع'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="form-label">اسم الفرع *</label>
                                <input name="name" defaultValue={editing?.name || ''} className="form-input" required />
                            </div>

                            <div>
                                <label className="form-label">العنوان</label>
                                <input name="address" defaultValue={editing?.address || ''} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">الهاتف</label>
                                <input name="phone" defaultValue={editing?.phone || ''} className="form-input" />
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
