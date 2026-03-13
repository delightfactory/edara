import { useState, useEffect } from 'react'
import {
    X, Loader2, Building2, ToggleLeft, ToggleRight, Check, Factory,
    Phone, Plus, Trash2, Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SupplierWithRefs, SupplierInput } from '@/lib/types/suppliers'
import type { BrandLookup } from '@/lib/types/suppliers'
import type { SupplierContact, SupplierContactInput } from '@/lib/types/suppliers'
import { PAYMENT_TERMS_LABELS } from '@/lib/types/suppliers'
import { getSupplierContacts, createSupplierContact, deleteSupplierContact, updateSupplierContact } from '@/lib/services/suppliers'
import type { PaymentTermsType } from '@/lib/types/customers'
import { toast } from 'sonner'

interface SupplierFormDialogProps {
    open: boolean
    supplier: SupplierWithRefs | null
    allBrands: BrandLookup[]
    saving: boolean
    onClose: () => void
    onSave: (data: Partial<SupplierInput>, brandIds: string[], isEdit: boolean) => void
}

export function SupplierFormDialog({
    open, supplier, allBrands, saving, onClose, onSave,
}: SupplierFormDialogProps) {
    const [form, setForm] = useState<Partial<SupplierInput>>({})
    const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])
    const [contacts, setContacts] = useState<SupplierContact[]>([])
    const [newContact, setNewContact] = useState<Partial<SupplierContactInput>>({ name: '', phone: null, role: null })
    const [addingContact, setAddingContact] = useState(false)
    const [editingContactId, setEditingContactId] = useState<string | null>(null)
    const [editContactForm, setEditContactForm] = useState<{ name: string; phone: string; role: string }>({ name: '', phone: '', role: '' })

    useEffect(() => {
        if (open) {
            if (supplier) {
                setForm({
                    code: supplier.code,
                    name: supplier.name,
                    phone: supplier.phone,
                    email: supplier.email,
                    address: supplier.address,
                    payment_terms: supplier.payment_terms,
                    is_manufacturer: supplier.is_manufacturer,
                    is_active: supplier.is_active,
                })
                setSelectedBrandIds(supplier.brands.map(b => b.id))
            } else {
                setForm({
                    code: null, name: '', phone: null, email: null, address: null,
                    payment_terms: 'cash', is_manufacturer: false, is_active: true,
                })
                setSelectedBrandIds([])
            }
        }
    }, [open, supplier])

    // Load contacts when editing
    useEffect(() => {
        if (open && supplier?.id) {
            getSupplierContacts(supplier.id).then(setContacts).catch(() => { })
        } else {
            setContacts([])
        }
    }, [open, supplier])

    const toggleBrand = (brandId: string) => {
        setSelectedBrandIds(prev =>
            prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]
        )
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] p-4">
            <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

            <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] flex flex-col"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                {/* Gradient Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{supplier ? 'تعديل مورد' : 'إضافة مورد جديد'}</h2>
                                <p className="text-xs text-primary-200 mt-0.5">{supplier ? `تعديل ${supplier.name}` : 'أدخل بيانات المورد'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form — scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم المورد *</label>
                            <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="form-input" placeholder="مثال: مصنع البريق لكيماويات السيارات" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>كود المورد</label>
                            <input type="text" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                className="form-input" dir="ltr" placeholder="SUP-001" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الهاتف</label>
                            <input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                className="form-input" dir="ltr" placeholder="05XXXXXXXX" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
                        <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="form-input" dir="ltr" placeholder="supplier@example.com" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>العنوان</label>
                        <textarea value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            className="form-input" style={{ height: '3.5rem', resize: 'none' }} placeholder="المنطقة الصناعية..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>شروط الدفع *</label>
                        <select value={form.payment_terms || 'cash'} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value as PaymentTermsType }))} className="form-input">
                            {(Object.entries(PAYMENT_TERMS_LABELS) as [PaymentTermsType, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="edara-divider" />

                    {/* Manufacturer Toggle */}
                    <button type="button" onClick={() => setForm(f => ({ ...f, is_manufacturer: !f.is_manufacturer }))}
                        className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                        style={{ backgroundColor: 'var(--empty-bg)' }}>
                        <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4" style={{ color: form.is_manufacturer ? 'var(--color-primary-600)' : 'var(--text-muted)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {form.is_manufacturer ? 'هذا المورد مُصنّع' : 'مورد عادي (ليس مُصنّع)'}
                            </span>
                        </div>
                        {form.is_manufacturer ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    {/* Active Toggle */}
                    <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                        className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                        style={{ backgroundColor: 'var(--empty-bg)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {form.is_active ? 'مورد نشط' : 'مورد معطّل'}
                        </span>
                        {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    <div className="edara-divider" />

                    {/* Brand Multi-Select */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            العلامات التجارية المُغطاة
                            <span className="text-xs font-normal mr-2" style={{ color: 'var(--text-muted)' }}>({selectedBrandIds.length} محددة)</span>
                        </label>
                        {allBrands.length === 0 ? (
                            <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>لا توجد علامات تجارية متاحة</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {allBrands.map(brand => {
                                    const isSelected = selectedBrandIds.includes(brand.id)
                                    return (
                                        <button key={brand.id} type="button" onClick={() => toggleBrand(brand.id)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200",
                                                isSelected
                                                    ? "bg-primary-50 dark:bg-primary-950/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
                                                    : "hover:border-primary-200 dark:hover:border-primary-800"
                                            )}
                                            style={!isSelected ? { borderColor: 'var(--card-border)', color: 'var(--text-secondary)' } : {}}>
                                            <div className={cn(
                                                "flex h-4 w-4 items-center justify-center rounded shrink-0 transition-all",
                                                isSelected ? "bg-primary-600 text-white" : "border"
                                            )} style={!isSelected ? { borderColor: 'var(--card-border)' } : {}}>
                                                {isSelected && <Check className="h-2.5 w-2.5" />}
                                            </div>
                                            <span className="truncate">{brand.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="edara-divider" />

                    {/* Supplier Contacts */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            <Phone className="h-3.5 w-3.5 inline ml-1" />
                            جهات الاتصال
                            <span className="text-xs font-normal mr-2" style={{ color: 'var(--text-muted)' }}>({contacts.length})</span>
                        </label>
                        {!supplier ? (
                            <p className="text-xs py-2 text-center rounded-xl" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>
                                احفظ المورد أولاً ثم أضف جهات الاتصال
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {contacts.map(c => (
                                    editingContactId === c.id ? (
                                        <div key={c.id} className="rounded-xl p-3 border space-y-2" style={{ borderColor: 'var(--color-primary-300)', backgroundColor: 'var(--empty-bg)' }}>
                                            <input type="text" value={editContactForm.name} onChange={e => setEditContactForm(f => ({ ...f, name: e.target.value }))}
                                                className="form-input" placeholder="الاسم *" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="tel" value={editContactForm.phone} onChange={e => setEditContactForm(f => ({ ...f, phone: e.target.value }))}
                                                    className="form-input" dir="ltr" placeholder="الهاتف" />
                                                <input type="text" value={editContactForm.role} onChange={e => setEditContactForm(f => ({ ...f, role: e.target.value }))}
                                                    className="form-input" placeholder="الدور" />
                                            </div>
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setEditingContactId(null)} className="btn btn-secondary btn-sm text-xs">إلغاء</button>
                                                <button onClick={async () => {
                                                    if (!editContactForm.name.trim()) return
                                                    try {
                                                        await updateSupplierContact(c.id, {
                                                            name: editContactForm.name,
                                                            phone: editContactForm.phone || null,
                                                            role: editContactForm.role || null,
                                                        })
                                                        const updated = await getSupplierContacts(supplier.id)
                                                        setContacts(updated)
                                                        setEditingContactId(null)
                                                        toast.success('تم التحديث')
                                                    } catch { toast.error('فشل التحديث') }
                                                }} disabled={!editContactForm.name.trim()} className="btn btn-primary btn-sm text-xs">حفظ</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={c.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <div>
                                                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                    {c.role && <span>{c.role} • </span>}
                                                    {c.phone && <span dir="ltr">{c.phone}</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => {
                                                    setEditingContactId(c.id)
                                                    setEditContactForm({ name: c.name, phone: c.phone || '', role: c.role || '' })
                                                }} className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                    <Pencil className="h-2.5 w-2.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                                <button onClick={async () => {
                                                    try {
                                                        await deleteSupplierContact(c.id)
                                                        setContacts(prev => prev.filter(x => x.id !== c.id))
                                                        toast.success('تم الحذف')
                                                    } catch { toast.error('فشل الحذف') }
                                                }} className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-danger/10">
                                                    <Trash2 className="h-2.5 w-2.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ))}
                                {addingContact ? (
                                    <div className="rounded-xl p-3 border space-y-2" style={{ borderColor: 'var(--card-border)' }}>
                                        <input type="text" value={newContact.name || ''} onChange={e => setNewContact(f => ({ ...f, name: e.target.value }))}
                                            className="form-input" placeholder="الاسم *" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="tel" value={newContact.phone || ''} onChange={e => setNewContact(f => ({ ...f, phone: e.target.value || null }))}
                                                className="form-input" dir="ltr" placeholder="الهاتف" />
                                            <input type="text" value={newContact.role || ''} onChange={e => setNewContact(f => ({ ...f, role: e.target.value || null }))}
                                                className="form-input" placeholder="الدور" />
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => setAddingContact(false)} className="btn btn-secondary btn-sm">إلغاء</button>
                                            <button onClick={async () => {
                                                if (!newContact.name?.trim()) return
                                                try {
                                                    const created = await createSupplierContact({ ...newContact, supplier_id: supplier.id } as SupplierContactInput)
                                                    setContacts(prev => [...prev, created])
                                                    setNewContact({ name: '', phone: null, role: null })
                                                    setAddingContact(false)
                                                    toast.success('تمت الإضافة')
                                                } catch { toast.error('فشلت الإضافة') }
                                            }} disabled={!newContact.name?.trim()} className="btn btn-primary btn-sm">حفظ</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setAddingContact(true)} className="btn btn-ghost w-full text-primary-600 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> إضافة جهة اتصال
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={() => onSave(form, selectedBrandIds, !!supplier)} disabled={saving || !form.name?.trim()} className="btn btn-primary">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {supplier ? 'تحديث' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    )
}
