import { useState, useEffect } from 'react'
import {
    Award, Plus, X, Loader2, Pencil, Trash2, Search,
    ToggleLeft, ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/lib/services/products'
import type { Brand, BrandInput } from '@/lib/types/products'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function BrandsPage() {
    usePageTitle('العلامات التجارية')
    const { can } = useAuthStore()
    const [brands, setBrands] = useState<Brand[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Brand | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<BrandInput>>({})

    const loadBrands = async () => {
        setLoading(true)
        try {
            const data = await getBrands()
            setBrands(data)
        } catch {
            toast.error('فشل تحميل العلامات التجارية')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadBrands() }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ name: '', logo_url: null, is_active: true })
        setShowForm(true)
    }

    const openEdit = (b: Brand) => {
        setEditing(b)
        setForm({ name: b.name, logo_url: b.logo_url, is_active: b.is_active })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.name?.trim()) { toast.error('اسم العلامة التجارية مطلوب'); return }
        setSaving(true)
        try {
            if (editing) {
                await updateBrand(editing.id, form)
                toast.success('تم تحديث العلامة التجارية')
            } else {
                await createBrand(form)
                toast.success('تم إنشاء العلامة التجارية')
            }
            setShowForm(false)
            loadBrands()
        } catch {
            toast.error('فشلت العملية')
        } finally {
            setSaving(false)
        }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteBrand(id)
            toast.success('تم حذف العلامة التجارية')
            loadBrands()
        } catch {
            toast.error('فشل الحذف — قد تكون مرتبطة بمنتجات أو موردين')
        } finally {
            setDeleting(null)
        }
    }

    const filtered = search
        ? brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
        : brands

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Award className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">العلامات التجارية</h1>
                        <p className="page-subtitle">{brands.length} علامة</p>
                    </div>
                </div>
                {can('products.products.update') && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة علامة
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="edara-card p-4">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="بحث بالاسم..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                </div>
            </div>

            {/* Grid Cards */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="edara-card p-5">
                            <div className="skeleton h-5 w-24 mb-3" />
                            <div className="skeleton h-3 w-16" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="edara-card p-12 text-center">
                    <Award className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="font-medium" style={{ color: 'var(--text-muted)' }}>{search ? 'لا توجد نتائج' : 'لا توجد علامات تجارية'}</p>
                    {!search && can('products.products.update') && (
                        <button onClick={openCreate} className="btn btn-primary btn-sm mt-3">
                            <Plus className="h-4 w-4" /> أضف أول علامة
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((b, i) => (
                        <div key={b.id} className="edara-card p-5 edara-tr-hover transition-all duration-200"
                            style={{ animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 shrink-0">
                                        <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                                        <span className={cn('badge text-[9px] mt-1', b.is_active ? 'badge-success' : 'badge-danger')}>
                                            {b.is_active ? 'نشطة' : 'معطّلة'}
                                        </span>
                                    </div>
                                </div>
                                {can('products.products.update') && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openEdit(b)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                            <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                        <button onClick={() => setConfirmId(b.id)} disabled={deleting === b.id} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger/10">
                                            {deleting === b.id ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Inline Dialog */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out]"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-4 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold">{editing ? 'تعديل علامة' : 'إضافة علامة تجارية'}</h3>
                                <button onClick={() => setShowForm(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم العلامة التجارية *</label>
                                <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="form-input" placeholder="مثال: سوناكس" />
                            </div>
                            <ImageUploadField
                                value={form.logo_url}
                                onChange={(url) => setForm(f => ({ ...f, logo_url: url }))}
                                bucket="brand-logos"
                                folder="brands"
                                label="شعار العلامة التجارية"
                            />
                            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all"
                                style={{ backgroundColor: 'var(--empty-bg)' }}>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {form.is_active ? 'علامة نشطة' : 'علامة معطّلة'}
                                </span>
                                {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                            <button onClick={handleSave} disabled={saving || !form.name?.trim()} className="btn btn-primary">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editing ? 'تحديث' : 'إنشاء'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!confirmId} title="حذف العلامة التجارية" message="هل أنت متأكد من حذف هذه العلامة؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />
        </div>
    )
}
