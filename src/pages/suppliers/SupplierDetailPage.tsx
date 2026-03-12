import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Truck, ArrowRight, Loader2, Pencil,
    Phone, Mail, MapPin, Award,
    Trash2, Clock, Check, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
    getSupplier, getSupplierContacts, deleteSupplierContact,
    updateSupplierContact, updateSupplier, getActiveBrands,
} from '@/lib/services/suppliers'
import type { SupplierWithRefs, SupplierContact, SupplierInput, BrandLookup } from '@/lib/types/suppliers'
import { PAYMENT_TERMS_LABELS } from '@/lib/types/suppliers'
import type { PaymentTermsType } from '@/lib/types/customers'
import { SupplierFormDialog } from '@/components/modules/suppliers/SupplierFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function SupplierDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { can } = useAuthStore()
    usePageTitle('تفاصيل المورد')

    const [supplier, setSupplier] = useState<SupplierWithRefs | null>(null)
    const [contacts, setContacts] = useState<SupplierContact[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Inline edit state
    const [editingContact, setEditingContact] = useState<string | null>(null)
    const [editContactForm, setEditContactForm] = useState<{ name: string; phone: string; role: string }>({ name: '', phone: '', role: '' })
    const [savingContact, setSavingContact] = useState(false)

    // Form dialog state
    const [showForm, setShowForm] = useState(false)
    const [formSaving, setFormSaving] = useState(false)
    const [allBrands, setAllBrands] = useState<BrandLookup[]>([])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([
            getSupplier(id),
            getSupplierContacts(id),
        ]).then(([s, ct]) => {
            setSupplier(s)
            setContacts(ct)
        }).catch(() => {
            toast.error('فشل تحميل بيانات المورد')
        }).finally(() => setLoading(false))
    }, [id])

    const handleDeleteContact = async () => {
        if (!confirmId) return
        setDeleting(true)
        try {
            await deleteSupplierContact(confirmId)
            setContacts(prev => prev.filter(c => c.id !== confirmId))
            toast.success('تم حذف جهة الاتصال')
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(false)
            setConfirmId(null)
        }
    }

    const startEditContact = (c: SupplierContact) => {
        setEditingContact(c.id)
        setEditContactForm({ name: c.name, phone: c.phone || '', role: c.role || '' })
    }

    const saveContact = async () => {
        if (!editingContact || !editContactForm.name.trim()) return
        setSavingContact(true)
        try {
            const updated = await updateSupplierContact(editingContact, {
                name: editContactForm.name,
                phone: editContactForm.phone || null,
                role: editContactForm.role || null,
            })
            setContacts(prev => prev.map(c => c.id === editingContact ? { ...c, ...updated } : c))
            setEditingContact(null)
            toast.success('تم تحديث جهة الاتصال')
        } catch {
            toast.error('فشل تحديث جهة الاتصال')
        } finally {
            setSavingContact(false)
        }
    }

    const openEditDialog = () => {
        getActiveBrands().then(setAllBrands).catch(() => {})
        setShowForm(true)
    }

    const handleFormSave = async (data: Partial<SupplierInput>, brandIds: string[], isEdit: boolean) => {
        if (!isEdit || !supplier) return
        setFormSaving(true)
        try {
            await updateSupplier(supplier.id, data, brandIds)
            toast.success('تم تحديث بيانات المورد')
            setShowForm(false)
            const updated = await getSupplier(supplier.id)
            setSupplier(updated)
        } catch {
            toast.error('فشل تحديث المورد')
        } finally {
            setFormSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary-600)' }} />
            </div>
        )
    }

    if (!supplier) {
        return (
            <div className="text-center py-20 space-y-3">
                <Truck className="h-12 w-12 mx-auto" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-muted)' }}>المورد غير موجود</p>
                <button onClick={() => navigate('/purchases/suppliers')} className="btn btn-secondary btn-sm">
                    <ArrowRight className="h-4 w-4" /> العودة للموردين
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/purchases/suppliers')}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30"
                        title="العودة للموردين">
                        <ArrowRight className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="page-title">{supplier.name}</h1>
                            {supplier.is_manufacturer && (
                                <span className="badge badge-info text-[10px]">مُصنّع</span>
                            )}
                        </div>
                        <p className="page-subtitle">{supplier.code || '—'}</p>
                    </div>
                </div>
                {can('purchases.suppliers.update') && (
                    <button onClick={openEditDialog} className="btn btn-primary">
                        <Pencil className="h-4 w-4" /> تعديل
                    </button>
                )}
            </div>

            {/* Info Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Basic Info */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>المعلومات الأساسية</h3>
                    </div>
                    <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="الهاتف" value={supplier.phone} dir="ltr" />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="البريد" value={supplier.email} dir="ltr" />
                    <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="العنوان" value={supplier.address} />
                    <InfoRow label="شروط الدفع" value={PAYMENT_TERMS_LABELS[supplier.payment_terms as PaymentTermsType]} />
                    <InfoRow label="الحالة" value={supplier.is_active ? 'نشط' : 'معطّل'}
                        valueColor={supplier.is_active ? 'var(--color-success)' : 'var(--color-danger)'} />
                </div>

                {/* Brands */}
                <div className="edara-card">
                    <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--divider-color)' }}>
                        <Award className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            العلامات التجارية ({supplier.brands.length})
                        </h3>
                    </div>
                    {supplier.brands.length === 0 ? (
                        <div className="p-8 text-center">
                            <Award className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>لا توجد علامات</p>
                        </div>
                    ) : (
                        <div className="p-4 flex flex-wrap gap-2">
                            {supplier.brands.map(b => (
                                <div key={b.id} className="flex items-center gap-2 rounded-xl px-3 py-2"
                                    style={{ backgroundColor: 'var(--empty-bg)' }}>
                                    {b.logo_url ? (
                                        <img src={b.logo_url} alt={b.name} className="h-5 w-5 rounded object-contain" />
                                    ) : (
                                        <Award className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                    )}
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contacts */}
                <div className="edara-card">
                    <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--divider-color)' }}>
                        <Phone className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            جهات الاتصال ({contacts.length})
                        </h3>
                    </div>
                    {contacts.length === 0 ? (
                        <div className="p-8 text-center">
                            <Phone className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>لا توجد جهات اتصال</p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--divider-color)' }}>
                            {contacts.map(c => (
                                <div key={c.id} className="px-5 py-3 edara-tr-hover">
                                    {editingContact === c.id ? (
                                        <div className="space-y-2">
                                            <input type="text" value={editContactForm.name}
                                                onChange={e => setEditContactForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="form-input h-8 text-sm" placeholder="الاسم" />
                                            <div className="flex gap-2">
                                                <input type="text" value={editContactForm.phone}
                                                    onChange={e => setEditContactForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="form-input h-8 text-sm flex-1" placeholder="الهاتف" dir="ltr" />
                                                <input type="text" value={editContactForm.role}
                                                    onChange={e => setEditContactForm(prev => ({ ...prev, role: e.target.value }))}
                                                    className="form-input h-8 text-sm flex-1" placeholder="الدور" />
                                            </div>
                                            <div className="flex gap-1.5 justify-end">
                                                <button onClick={() => setEditingContact(null)}
                                                    className="btn btn-ghost btn-sm text-xs"><X className="h-3 w-3" /> إلغاء</button>
                                                <button onClick={saveContact} disabled={savingContact}
                                                    className="btn btn-primary btn-sm text-xs">
                                                    {savingContact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} حفظ
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    {c.phone && <span className="text-xs" style={{ color: 'var(--text-muted)' }} dir="ltr">{c.phone}</span>}
                                                    {c.role && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.role}</span>}
                                                </div>
                                            </div>
                                            {can('purchases.suppliers.update') && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEditContact(c)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                        <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    <button onClick={() => setConfirmId(c.id)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger/10">
                                                        <Trash2 className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Timestamps */}
            <div className="edara-card p-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>تاريخ الإنشاء: {new Date(supplier.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {supplier.updated_at && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>آخر تحديث: {new Date(supplier.updated_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                )}
            </div>

            <ConfirmDialog open={!!confirmId} title="حذف جهة الاتصال" message="هل أنت متأكد من الحذف؟"
                loading={deleting} onConfirm={handleDeleteContact} onCancel={() => setConfirmId(null)} />

            <SupplierFormDialog
                open={showForm} supplier={supplier}
                allBrands={allBrands} saving={formSaving}
                onClose={() => setShowForm(false)} onSave={handleFormSave}
            />
        </div>
    )
}

function InfoRow({ icon, label, value, dir, valueColor }: {
    icon?: React.ReactNode; label: string; value?: string | null; dir?: string; valueColor?: string
}) {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
                {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <span className="text-sm font-medium" dir={dir} style={{ color: valueColor || 'var(--text-primary)' }}>
                {value || '—'}
            </span>
        </div>
    )
}
