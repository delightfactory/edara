import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    HandshakeIcon, ArrowRight, Phone, Mail, MapPin,
    CreditCard, User, Building2, Loader2, Pencil,
    Trash2, Navigation, Clock, Check, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
    getCustomer, getCustomerContacts, getCustomerAddresses,
    deleteCustomerContact, deleteCustomerAddress,
    updateCustomerContact, updateCustomerAddress,
    updateCustomer,
} from '@/lib/services/customers'
import { getProfileLookups } from '@/lib/services/inventory'
import { getPriceLists } from '@/lib/services/products'
import type { CustomerWithRefs, CustomerContact, CustomerAddress, CustomerInput } from '@/lib/types/customers'
import { CUSTOMER_TYPE_LABELS, CLASSIFICATION_LABELS, CLASSIFICATION_COLORS, PAYMENT_TERMS_LABELS, DELIVERY_METHOD_LABELS } from '@/lib/types/customers'
import type { CustomerType, PaymentTermsType, DeliveryMethod } from '@/lib/types/customers'
import type { ProfileLookup } from '@/lib/types/inventory'
import type { PriceList } from '@/lib/types/products'
import { CustomerFormDialog } from '@/components/modules/customers/CustomerFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { can } = useAuthStore()
    usePageTitle('تفاصيل العميل')

    const [customer, setCustomer] = useState<CustomerWithRefs | null>(null)
    const [contacts, setContacts] = useState<CustomerContact[]>([])
    const [addresses, setAddresses] = useState<CustomerAddress[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'contact' | 'address'; id: string } | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Inline edit state
    const [editingContact, setEditingContact] = useState<string | null>(null)
    const [editContactForm, setEditContactForm] = useState<{ name: string; phone: string; role: string }>({ name: '', phone: '', role: '' })
    const [savingContact, setSavingContact] = useState(false)
    const [editingAddress, setEditingAddress] = useState<string | null>(null)
    const [editAddressForm, setEditAddressForm] = useState<{ label: string; address: string }>({ label: '', address: '' })
    const [savingAddress, setSavingAddress] = useState(false)

    // Form dialog state (open edit dialog directly on detail page)
    const [showForm, setShowForm] = useState(false)
    const [formSaving, setFormSaving] = useState(false)
    const [profiles, setProfiles] = useState<ProfileLookup[]>([])
    const [priceLists, setPriceLists] = useState<PriceList[]>([])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([
            getCustomer(id),
            getCustomerContacts(id),
            getCustomerAddresses(id),
        ]).then(([c, ct, ad]) => {
            setCustomer(c)
            setContacts(ct)
            setAddresses(ad)
        }).catch(() => {
            toast.error('فشل تحميل بيانات العميل')
        }).finally(() => setLoading(false))
    }, [id])

    const handleDeleteItem = async () => {
        if (!confirmDelete) return
        setDeleting(true)
        try {
            if (confirmDelete.type === 'contact') {
                await deleteCustomerContact(confirmDelete.id)
                setContacts(prev => prev.filter(c => c.id !== confirmDelete.id))
                toast.success('تم حذف جهة الاتصال')
            } else {
                await deleteCustomerAddress(confirmDelete.id)
                setAddresses(prev => prev.filter(a => a.id !== confirmDelete.id))
                toast.success('تم حذف العنوان')
            }
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(false)
            setConfirmDelete(null)
        }
    }

    const startEditContact = (c: CustomerContact) => {
        setEditingContact(c.id)
        setEditContactForm({ name: c.name, phone: c.phone || '', role: c.role || '' })
    }

    const saveContact = async () => {
        if (!editingContact || !editContactForm.name.trim()) return
        setSavingContact(true)
        try {
            const updated = await updateCustomerContact(editingContact, {
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

    const startEditAddress = (a: CustomerAddress) => {
        setEditingAddress(a.id)
        setEditAddressForm({ label: a.label, address: a.address })
    }

    const saveAddress = async () => {
        if (!editingAddress || !editAddressForm.label.trim()) return
        setSavingAddress(true)
        try {
            const updated = await updateCustomerAddress(editingAddress, {
                label: editAddressForm.label,
                address: editAddressForm.address,
            })
            setAddresses(prev => prev.map(a => a.id === editingAddress ? { ...a, ...updated } : a))
            setEditingAddress(null)
            toast.success('تم تحديث العنوان')
        } catch {
            toast.error('فشل تحديث العنوان')
        } finally {
            setSavingAddress(false)
        }
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(val)

    const openEditDialog = () => {
        // Load lookups on demand
        getProfileLookups().then(setProfiles).catch(() => {})
        getPriceLists().then(setPriceLists).catch(() => {})
        setShowForm(true)
    }

    const handleFormSave = async (data: Partial<CustomerInput>, isEdit: boolean) => {
        if (!isEdit || !customer) return
        setFormSaving(true)
        try {
            await updateCustomer(customer.id, data)
            toast.success('تم تحديث بيانات العميل')
            setShowForm(false)
            // Reload customer data
            const updated = await getCustomer(customer.id)
            setCustomer(updated)
        } catch {
            toast.error('فشل تحديث العميل')
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

    if (!customer) {
        return (
            <div className="text-center py-20 space-y-3">
                <HandshakeIcon className="h-12 w-12 mx-auto" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-muted)' }}>العميل غير موجود</p>
                <button onClick={() => navigate('/crm/customers')} className="btn btn-secondary btn-sm">
                    <ArrowRight className="h-4 w-4" /> العودة للعملاء
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/crm/customers')}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30"
                        title="العودة للعملاء">
                        <ArrowRight className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="page-title">{customer.name}</h1>
                            <span className={cn('badge text-[10px]', CLASSIFICATION_COLORS[customer.classification])}>
                                {CLASSIFICATION_LABELS[customer.classification]}
                            </span>
                        </div>
                        <p className="page-subtitle">{customer.code || '—'} • {CUSTOMER_TYPE_LABELS[customer.customer_type as CustomerType]}</p>
                    </div>
                </div>
                {can('crm.customers.update') && (
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
                        <User className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>المعلومات الأساسية</h3>
                    </div>
                    <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="الهاتف" value={customer.phone} dir="ltr" />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="البريد" value={customer.email} dir="ltr" />
                    <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="العنوان" value={customer.address} />
                    <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="الرقم الضريبي" value={customer.tax_registration_number} dir="ltr" />
                </div>

                {/* Financial */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>المعلومات المالية</h3>
                    </div>
                    <InfoRow label="حد الائتمان" value={formatCurrency(customer.credit_limit)} />
                    <InfoRow label="الرصيد الحالي" value={formatCurrency(customer.current_balance)}
                        valueColor={customer.current_balance > customer.credit_limit ? 'var(--color-danger)' : undefined} />
                    <InfoRow label="شروط الدفع" value={PAYMENT_TERMS_LABELS[customer.payment_terms as PaymentTermsType]} />
                    <InfoRow label="طريقة التوصيل" value={DELIVERY_METHOD_LABELS[customer.default_delivery_method as DeliveryMethod]} />
                </div>

                {/* Assignments */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Navigation className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>الإسنادات</h3>
                    </div>
                    <InfoRow label="المندوب" value={customer.assigned_rep?.full_name} />
                    <InfoRow label="قائمة الأسعار" value={customer.price_list?.name} />
                    <InfoRow label="الحالة" value={customer.is_active ? 'نشط' : 'معطّل'}
                        valueColor={customer.is_active ? 'var(--color-success)' : 'var(--color-danger)'} />
                    {customer.gps_lat && customer.gps_lng && (
                        <div className="pt-2">
                            <a href={`https://www.google.com/maps?q=${customer.gps_lat},${customer.gps_lng}`}
                                target="_blank" rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm w-full text-xs">
                                <MapPin className="h-3.5 w-3.5" /> عرض على الخريطة
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Contacts & Addresses */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Contacts */}
                <div className="edara-card">
                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--divider-color)' }}>
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
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {c.name}
                                                    {c.is_primary && <span className="badge badge-primary text-[9px] mr-2">رئيسي</span>}
                                                </p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    {c.phone && <span className="text-xs" style={{ color: 'var(--text-muted)' }} dir="ltr">{c.phone}</span>}
                                                    {c.role && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.role}</span>}
                                                </div>
                                            </div>
                                            {can('crm.customers.update') && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEditContact(c)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                        <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete({ type: 'contact', id: c.id })}
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

                {/* Addresses */}
                <div className="edara-card">
                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--divider-color)' }}>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            العناوين ({addresses.length})
                        </h3>
                    </div>
                    {addresses.length === 0 ? (
                        <div className="p-8 text-center">
                            <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>لا توجد عناوين</p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--divider-color)' }}>
                            {addresses.map(a => (
                                <div key={a.id} className="px-5 py-3 edara-tr-hover">
                                    {editingAddress === a.id ? (
                                        <div className="space-y-2">
                                            <input type="text" value={editAddressForm.label}
                                                onChange={e => setEditAddressForm(prev => ({ ...prev, label: e.target.value }))}
                                                className="form-input h-8 text-sm" placeholder="التسمية" />
                                            <input type="text" value={editAddressForm.address}
                                                onChange={e => setEditAddressForm(prev => ({ ...prev, address: e.target.value }))}
                                                className="form-input h-8 text-sm" placeholder="العنوان" />
                                            <div className="flex gap-1.5 justify-end">
                                                <button onClick={() => setEditingAddress(null)}
                                                    className="btn btn-ghost btn-sm text-xs"><X className="h-3 w-3" /> إلغاء</button>
                                                <button onClick={saveAddress} disabled={savingAddress}
                                                    className="btn btn-primary btn-sm text-xs">
                                                    {savingAddress ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} حفظ
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {a.label}
                                                    {a.is_default && <span className="badge badge-success text-[9px] mr-2">افتراضي</span>}
                                                </p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.address}</p>
                                                {a.gps_lat && a.gps_lng && (
                                                    <a href={`https://www.google.com/maps?q=${a.gps_lat},${a.gps_lng}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="text-xs underline mt-0.5 inline-block" style={{ color: 'var(--color-primary-600)' }}>
                                                        عرض على الخريطة
                                                    </a>
                                                )}
                                            </div>
                                            {can('crm.customers.update') && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEditAddress(a)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                        <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete({ type: 'address', id: a.id })}
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
                    <span>تاريخ الإنشاء: {new Date(customer.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {customer.updated_at && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>آخر تحديث: {new Date(customer.updated_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                )}
            </div>

            <ConfirmDialog open={!!confirmDelete} title="حذف" message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء."
                loading={deleting} onConfirm={handleDeleteItem} onCancel={() => setConfirmDelete(null)} />

            {/* Edit Form Dialog — opens directly on detail page */}
            <CustomerFormDialog
                open={showForm}
                customer={customer}
                profiles={profiles}
                priceLists={priceLists}
                saving={formSaving}
                onClose={() => setShowForm(false)}
                onSave={handleFormSave}
            />
        </div>
    )
}

/** Reusable info row for detail cards */
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
