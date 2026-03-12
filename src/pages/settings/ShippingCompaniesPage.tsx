import { useState, useEffect } from 'react'
import {
    Truck, Plus, X, Loader2, Pencil, Trash2, Search,
    ToggleLeft, ToggleRight, Globe, Phone, Mail, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import {
    getShippingCompanies, createShippingCompany,
    updateShippingCompany, deleteShippingCompany,
} from '@/lib/services/shipping'
import type { ShippingCompany, ShippingCompanyInput } from '@/lib/types/shipping'
import { toast } from 'sonner'

export function ShippingCompaniesPage() {
    usePageTitle('شركات الشحن')
    const { can } = useAuthStore()
    const canEdit = can('settings.shipping.update')
    const [companies, setCompanies] = useState<ShippingCompany[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<ShippingCompany | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<ShippingCompanyInput>>({})

    const load = async () => {
        setLoading(true)
        try {
            setCompanies(await getShippingCompanies())
        } catch {
            toast.error('فشل تحميل شركات الشحن')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ name: '', contact_person: null, phone: null, email: null, website: null, is_active: true })
        setShowForm(true)
    }

    const openEdit = (c: ShippingCompany) => {
        setEditing(c)
        setForm({ name: c.name, contact_person: c.contact_person, phone: c.phone, email: c.email, website: c.website, is_active: c.is_active })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.name?.trim()) { toast.error('اسم الشركة مطلوب'); return }
        setSaving(true)
        try {
            if (editing) {
                await updateShippingCompany(editing.id, form)
                toast.success('تم تحديث شركة الشحن')
            } else {
                await createShippingCompany(form)
                toast.success('تم إنشاء شركة الشحن')
            }
            setShowForm(false)
            load()
        } catch {
            toast.error('فشلت العملية')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return
        setDeleting(id)
        try {
            await deleteShippingCompany(id)
            toast.success('تم الحذف')
            load()
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(null)
        }
    }

    const filtered = search
        ? companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact_person?.toLowerCase().includes(search.toLowerCase()))
        : companies

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">شركات الشحن</h1>
                        <p className="page-subtitle">{companies.length} شركة</p>
                    </div>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة شركة شحن
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="edara-card p-4">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="بحث بالاسم أو جهة الاتصال..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                </div>
            </div>

            {/* Card Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="edara-card p-5">
                            <div className="skeleton h-5 w-28 mb-3" />
                            <div className="skeleton h-3 w-20 mb-2" />
                            <div className="skeleton h-3 w-16" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="edara-card p-12 text-center">
                    <Truck className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="font-medium" style={{ color: 'var(--text-muted)' }}>{search ? 'لا توجد نتائج' : 'لا توجد شركات شحن'}</p>
                    {!search && canEdit && (
                        <button onClick={openCreate} className="btn btn-primary btn-sm mt-3">
                            <Plus className="h-4 w-4" /> أضف أول شركة
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((c, i) => (
                        <div key={c.id} className="edara-card p-5 edara-tr-hover transition-all duration-200"
                            style={{ animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 shrink-0">
                                        <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                        <span className={cn('badge text-[9px] mt-1', c.is_active ? 'badge-success' : 'badge-danger')}>
                                            {c.is_active ? 'نشطة' : 'معطّلة'}
                                        </span>
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openEdit(c)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                            <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger/10">
                                            {deleting === c.id ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {c.contact_person && <div className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" />{c.contact_person}</div>}
                                {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /><span dir="ltr">{c.phone}</span></div>}
                                {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span dir="ltr">{c.email}</span></div>}
                                {c.website && <div className="flex items-center gap-1.5"><Globe className="h-3 w-3 shrink-0" /><span dir="ltr">{c.website}</span></div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Inline Dialog */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] flex flex-col"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-4 text-white rounded-t-2xl shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold">{editing ? 'تعديل شركة شحن' : 'إضافة شركة شحن'}</h3>
                                <button onClick={() => setShowForm(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم الشركة *</label>
                                <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="form-input" placeholder="مثال: أرامكس" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>مسؤول التواصل</label>
                                <input type="text" value={form.contact_person || ''} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value || null }))}
                                    className="form-input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الهاتف</label>
                                <input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))}
                                    className="form-input" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
                                <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))}
                                    className="form-input" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الموقع الإلكتروني</label>
                                <input type="url" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value || null }))}
                                    className="form-input" dir="ltr" placeholder="https://..." />
                            </div>
                            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all"
                                style={{ backgroundColor: 'var(--empty-bg)' }}>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {form.is_active ? 'شركة نشطة' : 'شركة معطّلة'}
                                </span>
                                {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                            <button onClick={handleSave} disabled={saving || !form.name?.trim()} className="btn btn-primary">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editing ? 'تحديث' : 'إنشاء'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
