import { useState, useEffect } from 'react'
import {
    X, Loader2, HandshakeIcon, User,
    CreditCard, Truck, MapPin, MapPinned, Navigation, ToggleLeft, ToggleRight,
    Phone, Plus, Trash2, Pencil, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
    CustomerWithRefs, CustomerInput,
    CustomerType, CustomerClassification, PaymentTermsType, DeliveryMethod,
    CustomerContact, CustomerContactInput, CustomerAddress, CustomerAddressInput,
} from '@/lib/types/customers'
import {
    CUSTOMER_TYPE_LABELS, CLASSIFICATION_LABELS,
    PAYMENT_TERMS_LABELS, DELIVERY_METHOD_LABELS,
} from '@/lib/types/customers'
import {
    getCustomerContacts, createCustomerContact, deleteCustomerContact,
    updateCustomerContact,
    getCustomerAddresses, createCustomerAddress, deleteCustomerAddress,
    updateCustomerAddress,
} from '@/lib/services/customers'
import { getGovernorates, getCities, getAreas } from '@/lib/services/geography'
import type { Governorate } from '@/lib/types/geography'
import type { ProfileLookup } from '@/lib/types/inventory'
import { toast } from 'sonner'

interface PriceListLookup {
    id: string
    name: string
}

interface CustomerFormDialogProps {
    open: boolean
    customer: CustomerWithRefs | null
    profiles: ProfileLookup[]
    priceLists: PriceListLookup[]
    saving: boolean
    onClose: () => void
    onSave: (data: Partial<CustomerInput>, isEdit: boolean) => void
}

type TabId = 'basic' | 'financial' | 'delivery' | 'contacts' | 'addresses'

export function CustomerFormDialog({
    open, customer, profiles, priceLists, saving, onClose, onSave,
}: CustomerFormDialogProps) {
    const [activeTab, setActiveTab] = useState<TabId>('basic')
    const [form, setForm] = useState<Partial<CustomerInput>>({})

    // Contacts & Addresses (for editing existing customers)
    const [contacts, setContacts] = useState<CustomerContact[]>([])
    const [addresses, setAddresses] = useState<CustomerAddress[]>([])
    const [newContact, setNewContact] = useState<Partial<CustomerContactInput>>({ name: '', phone: null, role: null, is_primary: false })
    const [newAddress, setNewAddress] = useState<Partial<CustomerAddressInput>>({ label: '', address: '', gps_lat: null, gps_lng: null, is_default: false })
    const [addingContact, setAddingContact] = useState(false)
    const [addingAddress, setAddingAddress] = useState(false)
    const [locatingGPS, setLocatingGPS] = useState(false)

    // Inline editing state for contacts/addresses
    const [editingContactId, setEditingContactId] = useState<string | null>(null)
    const [editContactForm, setEditContactForm] = useState<Partial<CustomerContactInput>>({})
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
    const [editAddressForm, setEditAddressForm] = useState<Partial<CustomerAddressInput>>({})
    const [locatingEditGPS, setLocatingEditGPS] = useState(false)

    // Geography cascading
    const [governorates, setGovernorates] = useState<Governorate[]>([])
    const [cities, setCities] = useState<{ id: string; name: string }[]>([])
    const [areas, setAreas] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        if (open) {
            setActiveTab('basic')
            if (customer) {
                setForm({
                    code: customer.code,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.address,
                    gps_lat: customer.gps_lat,
                    gps_lng: customer.gps_lng,
                    customer_type: customer.customer_type,
                    classification: customer.classification,
                    credit_limit: customer.credit_limit,
                    payment_terms: customer.payment_terms,
                    tax_registration_number: customer.tax_registration_number,
                    default_delivery_method: customer.default_delivery_method,
                    price_list_id: customer.price_list_id,
                    assigned_rep_id: customer.assigned_rep_id,
                    governorate_id: customer.governorate_id ?? null,
                    city_id: customer.city_id ?? null,
                    area_id: customer.area_id ?? null,
                    is_active: customer.is_active,
                })
            } else {
                setForm({
                    code: null, name: '', phone: null, email: null, address: null,
                    gps_lat: null, gps_lng: null,
                    customer_type: 'retail', classification: 'C',
                    credit_limit: 0, payment_terms: 'cash',
                    tax_registration_number: null, default_delivery_method: 'direct',
                    price_list_id: null, assigned_rep_id: null,
                    governorate_id: null, city_id: null, area_id: null,
                    is_active: true,
                })
            }
        }
    }, [open, customer])

    // Load contacts & addresses when editing
    useEffect(() => {
        if (open && customer?.id) {
            getCustomerContacts(customer.id).then(setContacts).catch(() => { })
            getCustomerAddresses(customer.id).then(setAddresses).catch(() => { })
        } else {
            setContacts([])
            setAddresses([])
        }
    }, [open, customer])

    // Business rule: wholesale/service_center → tax number required
    const isTaxRequired = form.customer_type === 'wholesale' || form.customer_type === 'service_center'

    // Load governorates once
    useEffect(() => {
        getGovernorates().then(setGovernorates).catch(() => {})
    }, [])

    // Load cities when governorate changes
    useEffect(() => {
        if (form.governorate_id) {
            getCities(form.governorate_id).then(c => setCities(c.map(x => ({ id: x.id, name: x.name })))).catch(() => {})
        } else {
            setCities([])
        }
    }, [form.governorate_id])

    // Load areas when city changes
    useEffect(() => {
        if (form.city_id) {
            getAreas(form.city_id).then(a => setAreas(a.map(x => ({ id: x.id, name: x.name })))).catch(() => {})
        } else {
            setAreas([])
        }
    }, [form.city_id])

    const handleSubmit = () => {
        if (!form.name?.trim()) return
        if (isTaxRequired && !form.tax_registration_number?.trim()) return

        const payload: Partial<CustomerInput> = {
            ...form,
            code: form.code || null,
            phone: form.phone || null,
            email: form.email || null,
            address: form.address || null,
            tax_registration_number: form.tax_registration_number || null,
            price_list_id: form.price_list_id || null,
            assigned_rep_id: form.assigned_rep_id || null,
            governorate_id: form.governorate_id || null,
            city_id: form.city_id || null,
            area_id: form.area_id || null,
            credit_limit: Number(form.credit_limit) || 0,
        }
        onSave(payload, !!customer)
    }

    if (!open) return null

    const tabs: { id: TabId; label: string; icon: typeof User }[] = [
        { id: 'basic', label: 'معلومات أساسية', icon: User },
        { id: 'financial', label: 'بيانات مالية', icon: CreditCard },
        { id: 'delivery', label: 'التوصيل', icon: Truck },
        { id: 'contacts', label: 'جهات الاتصال', icon: Phone },
        { id: 'addresses', label: 'العناوين', icon: MapPin },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] p-4">
            <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] flex flex-col"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                {/* Gradient Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <HandshakeIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{customer ? 'تعديل عميل' : 'إضافة عميل جديد'}</h2>
                                <p className="text-xs text-primary-200 mt-0.5">{customer ? `تعديل بيانات ${customer.name}` : 'أدخل بيانات العميل'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--divider-color)' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs sm:text-sm font-medium transition-all duration-200 relative",
                                    activeTab === tab.id
                                        ? 'text-primary-600'
                                        : 'hover:bg-[var(--table-hover-bg)]'
                                )}
                                style={{ color: activeTab === tab.id ? undefined : 'var(--text-muted)' }}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-600 rounded-t" />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content — scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* ─── Tab 1: Basic Info ─────────────────────────── */}
                    {activeTab === 'basic' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم العميل *</label>
                                    <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className="form-input" placeholder="مثال: مغسلة النجمة اللامعة" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>كود العميل</label>
                                    <input type="text" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                        className="form-input" dir="ltr" placeholder="يُولّد تلقائياً إن تُرك فارغاً" />
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
                                    className="form-input" dir="ltr" placeholder="email@example.com" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>نوع العميل *</label>
                                    <select value={form.customer_type || 'retail'} onChange={e => setForm(f => ({ ...f, customer_type: e.target.value as CustomerType }))} className="form-input">
                                        {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>تصنيف العميل *</label>
                                    <select value={form.classification || 'C'} onChange={e => setForm(f => ({ ...f, classification: e.target.value as CustomerClassification }))} className="form-input">
                                        {(Object.entries(CLASSIFICATION_LABELS) as [CustomerClassification, string][]).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المندوب المسؤول</label>
                                <select value={form.assigned_rep_id || ''} onChange={e => setForm(f => ({ ...f, assigned_rep_id: e.target.value || null }))} className="form-input">
                                    <option value="">— بدون —</option>
                                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                </select>
                            </div>
                            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                                style={{ backgroundColor: 'var(--empty-bg)' }}>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {form.is_active ? 'عميل نشط' : 'عميل معطّل'}
                                </span>
                                {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                            </button>
                        </>
                    )}

                    {/* ─── Tab 2: Financial ──────────────────────────── */}
                    {activeTab === 'financial' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>شروط الدفع *</label>
                                    <select value={form.payment_terms || 'cash'} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value as PaymentTermsType }))} className="form-input">
                                        {(Object.entries(PAYMENT_TERMS_LABELS) as [PaymentTermsType, string][]).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>حد الائتمان</label>
                                    <input type="number" value={form.credit_limit || 0} onChange={e => setForm(f => ({ ...f, credit_limit: Number(e.target.value) }))}
                                        className="form-input" dir="ltr" min={0} step="100" />
                                </div>
                            </div>

                            {/* Read-only current balance */}
                            {customer && (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        الرصيد الحالي
                                        <span className="text-[10px] font-normal mr-2 badge badge-warning" style={{ verticalAlign: 'middle' }}>للقراءة فقط</span>
                                    </label>
                                    <input type="text" value={new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(customer.current_balance)}
                                        className="form-input" dir="ltr" readOnly disabled
                                        style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>قائمة الأسعار</label>
                                <select value={form.price_list_id || ''} onChange={e => setForm(f => ({ ...f, price_list_id: e.target.value || null }))} className="form-input">
                                    <option value="">— القائمة الافتراضية —</option>
                                    {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                                </select>
                            </div>

                            <div className="edara-divider" />

                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    الرقم الضريبي
                                    {isTaxRequired && <span className="text-danger mr-1">*</span>}
                                    {isTaxRequired && <span className="text-[10px] font-normal mr-1" style={{ color: 'var(--color-danger)' }}>(مطلوب لنوع العميل المحدد)</span>}
                                </label>
                                <input type="text" value={form.tax_registration_number || ''}
                                    onChange={e => setForm(f => ({ ...f, tax_registration_number: e.target.value }))}
                                    className="form-input" dir="ltr" placeholder="3XXXXXXXXX00003"
                                    style={isTaxRequired && !form.tax_registration_number?.trim() ? { borderColor: 'var(--color-danger)' } : {}} />
                                {isTaxRequired && !form.tax_registration_number?.trim() && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                                        الرقم الضريبي مطلوب للعملاء من نوع {CUSTOMER_TYPE_LABELS[form.customer_type as CustomerType]}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* ─── Tab 3: Delivery ───────────────────────────── */}
                    {activeTab === 'delivery' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>طريقة التسليم الافتراضية *</label>
                                <select value={form.default_delivery_method || 'direct'} onChange={e => setForm(f => ({ ...f, default_delivery_method: e.target.value as DeliveryMethod }))} className="form-input">
                                    {(Object.entries(DELIVERY_METHOD_LABELS) as [DeliveryMethod, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>العنوان</label>
                                <textarea value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    className="form-input" style={{ height: '4rem', resize: 'none' }}
                                    placeholder="العنوان التفصيلي للعميل..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        <MapPin className="h-3.5 w-3.5 inline ml-1" />خط العرض
                                    </label>
                                    <input type="number" value={form.gps_lat || ''} onChange={e => setForm(f => ({ ...f, gps_lat: Number(e.target.value) || null }))}
                                        className="form-input" dir="ltr" step="0.0000001" placeholder="24.7136" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        <MapPin className="h-3.5 w-3.5 inline ml-1" />خط الطول
                                    </label>
                                    <input type="number" value={form.gps_lng || ''} onChange={e => setForm(f => ({ ...f, gps_lng: Number(e.target.value) || null }))}
                                        className="form-input" dir="ltr" step="0.0000001" placeholder="46.6753" />
                                </div>
                            </div>

                            {/* Geography */}
                            <div className="edara-divider" />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المحافظة</label>
                                    <select value={form.governorate_id || ''} onChange={e => setForm(f => ({ ...f, governorate_id: e.target.value || null, city_id: null, area_id: null }))} className="form-input">
                                        <option value="">— اختر —</option>
                                        {governorates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المدينة</label>
                                    <select value={form.city_id || ''} onChange={e => setForm(f => ({ ...f, city_id: e.target.value || null, area_id: null }))} className="form-input" disabled={!form.governorate_id}>
                                        <option value="">— اختر —</option>
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المنطقة</label>
                                    <select value={form.area_id || ''} onChange={e => setForm(f => ({ ...f, area_id: e.target.value || null }))} className="form-input" disabled={!form.city_id}>
                                        <option value="">— اختر —</option>
                                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ─── Tab 4: Contacts ──────────────────────────── */}
                    {activeTab === 'contacts' && (
                        <>
                            {!customer && (
                                <div className="rounded-xl p-3 text-xs text-center" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>
                                    احفظ العميل أولاً ثم أضف جهات الاتصال
                                </div>
                            )}
                            {customer && (
                                <>
                                    {contacts.length === 0 && !addingContact && (
                                        <div className="text-center py-6">
                                            <Phone className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد جهات اتصال</p>
                                        </div>
                                    )}
                                    {contacts.map(c => (
                                        <div key={c.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            {editingContactId === c.id ? (
                                                <div className="space-y-3">
                                                    <input type="text" value={editContactForm.name || ''}
                                                        onChange={e => setEditContactForm(f => ({ ...f, name: e.target.value }))}
                                                        className="form-input" placeholder="اسم جهة الاتصال *" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input type="tel" value={editContactForm.phone || ''}
                                                            onChange={e => setEditContactForm(f => ({ ...f, phone: e.target.value || null }))}
                                                            className="form-input" dir="ltr" placeholder="الهاتف" />
                                                        <input type="text" value={editContactForm.role || ''}
                                                            onChange={e => setEditContactForm(f => ({ ...f, role: e.target.value || null }))}
                                                            className="form-input" placeholder="الدور" />
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={!!editContactForm.is_primary}
                                                            onChange={e => setEditContactForm(f => ({ ...f, is_primary: e.target.checked }))}
                                                            className="rounded border-gray-300" />
                                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>جهة اتصال رئيسية</span>
                                                    </label>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditingContactId(null)} className="btn btn-secondary btn-sm">إلغاء</button>
                                                        <button onClick={async () => {
                                                            if (!editContactForm.name?.trim()) return
                                                            try {
                                                                const updated = await updateCustomerContact(c.id, editContactForm)
                                                                setContacts(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x))
                                                                setEditingContactId(null)
                                                                toast.success('تم تحديث جهة الاتصال')
                                                            } catch { toast.error('فشل التحديث') }
                                                        }} disabled={!editContactForm.name?.trim()} className="btn btn-primary btn-sm">
                                                            <Check className="h-3.5 w-3.5" /> حفظ
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
                                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                            {c.role && <span>{c.role} • </span>}
                                                            {c.phone && <span dir="ltr">{c.phone}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => {
                                                            setEditingContactId(c.id)
                                                            setEditContactForm({ name: c.name, phone: c.phone, role: c.role, is_primary: c.is_primary })
                                                        }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                            <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                        </button>
                                                        <button onClick={async () => {
                                                            try {
                                                                await deleteCustomerContact(c.id)
                                                                setContacts(prev => prev.filter(x => x.id !== c.id))
                                                                toast.success('تم حذف جهة الاتصال')
                                                            } catch { toast.error('فشل الحذف') }
                                                        }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger/10">
                                                            <Trash2 className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {addingContact ? (
                                        <div className="rounded-xl p-4 border space-y-3" style={{ borderColor: 'var(--card-border)' }}>
                                            <input type="text" value={newContact.name || ''} onChange={e => setNewContact(f => ({ ...f, name: e.target.value }))}
                                                className="form-input" placeholder="اسم جهة الاتصال *" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="tel" value={newContact.phone || ''} onChange={e => setNewContact(f => ({ ...f, phone: e.target.value || null }))}
                                                    className="form-input" dir="ltr" placeholder="الهاتف" />
                                                <input type="text" value={newContact.role || ''} onChange={e => setNewContact(f => ({ ...f, role: e.target.value || null }))}
                                                    className="form-input" placeholder="الدور (مدير، محاسب...)" />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={!!newContact.is_primary} onChange={e => setNewContact(f => ({ ...f, is_primary: e.target.checked }))}
                                                    className="rounded border-gray-300" />
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>جهة اتصال رئيسية</span>
                                            </label>
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setAddingContact(false)} className="btn btn-secondary btn-sm">إلغاء</button>
                                                <button onClick={async () => {
                                                    if (!newContact.name?.trim()) return
                                                    try {
                                                        const created = await createCustomerContact({ ...newContact, customer_id: customer.id } as CustomerContactInput)
                                                        setContacts(prev => [...prev, created])
                                                        setNewContact({ name: '', phone: null, role: null, is_primary: false })
                                                        setAddingContact(false)
                                                        toast.success('تمت الإضافة')
                                                    } catch { toast.error('فشلت الإضافة') }
                                                }} disabled={!newContact.name?.trim()} className="btn btn-primary btn-sm">
                                                    حفظ
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setAddingContact(true)} className="btn btn-ghost w-full text-primary-600">
                                            <Plus className="h-4 w-4" /> إضافة جهة اتصال
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* ─── Tab 5: Addresses ─────────────────────────── */}
                    {activeTab === 'addresses' && (
                        <>
                            {!customer && (
                                <div className="rounded-xl p-3 text-xs text-center" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>
                                    احفظ العميل أولاً ثم أضف العناوين
                                </div>
                            )}
                            {customer && (
                                <>
                                    {addresses.length === 0 && !addingAddress && (
                                        <div className="text-center py-6">
                                            <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد عناوين</p>
                                        </div>
                                    )}
                                    {addresses.map(a => (
                                        <div key={a.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            {editingAddressId === a.id ? (
                                                <div className="space-y-3">
                                                    <input type="text" value={editAddressForm.label || ''}
                                                        onChange={e => setEditAddressForm(f => ({ ...f, label: e.target.value }))}
                                                        className="form-input" placeholder="اسم العنوان *" />
                                                    <textarea value={editAddressForm.address || ''}
                                                        onChange={e => setEditAddressForm(f => ({ ...f, address: e.target.value }))}
                                                        className="form-input" style={{ height: '3rem', resize: 'none' }} placeholder="العنوان التفصيلي *" />
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={!!editAddressForm.is_default}
                                                            onChange={e => setEditAddressForm(f => ({ ...f, is_default: e.target.checked }))}
                                                            className="rounded border-gray-300" />
                                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>عنوان افتراضي</span>
                                                    </label>
                                                    <button type="button" onClick={() => {
                                                        if (!navigator.geolocation) { toast.error('المتصفح لا يدعم تحديد الموقع'); return }
                                                        setLocatingEditGPS(true)
                                                        navigator.geolocation.getCurrentPosition(
                                                            (pos) => {
                                                                setEditAddressForm(f => ({ ...f, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }))
                                                                setLocatingEditGPS(false)
                                                                toast.success('تم تحديد الموقع بنجاح')
                                                            },
                                                            () => { setLocatingEditGPS(false); toast.error('فشل تحديد الموقع') },
                                                            { enableHighAccuracy: true, timeout: 10000 }
                                                        )
                                                    }} disabled={locatingEditGPS}
                                                        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-xs font-medium transition-all"
                                                        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                                        {locatingEditGPS ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" /> : <Navigation className="h-3.5 w-3.5 text-primary-600" />}
                                                        {locatingEditGPS ? 'جاري تحديد الموقع...' : 'تحديد الموقع تلقائياً (GPS)'}
                                                    </button>
                                                    {(editAddressForm.gps_lat || editAddressForm.gps_lng) && (
                                                        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                                            <MapPinned className="h-3.5 w-3.5 text-success shrink-0" />
                                                            <span dir="ltr" className="tabular-nums">{editAddressForm.gps_lat?.toFixed(6)}, {editAddressForm.gps_lng?.toFixed(6)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditingAddressId(null)} className="btn btn-secondary btn-sm">إلغاء</button>
                                                        <button onClick={async () => {
                                                            if (!editAddressForm.label?.trim() || !editAddressForm.address?.trim()) return
                                                            try {
                                                                const updated = await updateCustomerAddress(a.id, editAddressForm)
                                                                setAddresses(prev => prev.map(x => x.id === a.id ? { ...x, ...updated } : x))
                                                                setEditingAddressId(null)
                                                                toast.success('تم تحديث العنوان')
                                                            } catch { toast.error('فشل التحديث') }
                                                        }} disabled={!editAddressForm.label?.trim() || !editAddressForm.address?.trim()} className="btn btn-primary btn-sm">
                                                            <Check className="h-3.5 w-3.5" /> حفظ
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
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => {
                                                            setEditingAddressId(a.id)
                                                            setEditAddressForm({ label: a.label, address: a.address, is_default: a.is_default, gps_lat: a.gps_lat, gps_lng: a.gps_lng })
                                                        }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                            <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                        </button>
                                                        <button onClick={async () => {
                                                            try {
                                                                await deleteCustomerAddress(a.id)
                                                                setAddresses(prev => prev.filter(x => x.id !== a.id))
                                                                toast.success('تم حذف العنوان')
                                                            } catch { toast.error('فشل الحذف') }
                                                        }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger/10">
                                                            <Trash2 className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {addingAddress ? (
                                        <div className="rounded-xl p-4 border space-y-3" style={{ borderColor: 'var(--card-border)' }}>
                                            <input type="text" value={newAddress.label || ''} onChange={e => setNewAddress(f => ({ ...f, label: e.target.value }))}
                                                className="form-input" placeholder="اسم العنوان * (مثل: الفرع الرئيسي)" />
                                            <textarea value={newAddress.address || ''} onChange={e => setNewAddress(f => ({ ...f, address: e.target.value }))}
                                                className="form-input" style={{ height: '3rem', resize: 'none' }} placeholder="العنوان التفصيلي *" />
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={!!newAddress.is_default} onChange={e => setNewAddress(f => ({ ...f, is_default: e.target.checked }))}
                                                    className="rounded border-gray-300" />
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>عنوان افتراضي</span>
                                            </label>
                                            {/* GPS Auto-detect */}
                                            <button type="button" onClick={() => {
                                                if (!navigator.geolocation) { toast.error('المتصفح لا يدعم تحديد الموقع'); return }
                                                setLocatingGPS(true)
                                                navigator.geolocation.getCurrentPosition(
                                                    (pos) => {
                                                        setNewAddress(f => ({ ...f, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }))
                                                        setLocatingGPS(false)
                                                        toast.success('تم تحديد الموقع بنجاح')
                                                    },
                                                    () => { setLocatingGPS(false); toast.error('فشل تحديد الموقع — تأكد من تفعيل الصلاحيات') },
                                                    { enableHighAccuracy: true, timeout: 10000 }
                                                )
                                            }} disabled={locatingGPS}
                                                className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-xs font-medium transition-all"
                                                style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-primary)' }}>
                                                {locatingGPS ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" /> : <Navigation className="h-3.5 w-3.5 text-primary-600" />}
                                                {locatingGPS ? 'جاري تحديد الموقع...' : 'تحديد الموقع تلقائياً (GPS)'}
                                            </button>
                                            {(newAddress.gps_lat || newAddress.gps_lng) && (
                                                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-secondary)' }}>
                                                    <MapPinned className="h-3.5 w-3.5 text-success shrink-0" />
                                                    <span dir="ltr" className="tabular-nums">{newAddress.gps_lat?.toFixed(6)}, {newAddress.gps_lng?.toFixed(6)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setAddingAddress(false)} className="btn btn-secondary btn-sm">إلغاء</button>
                                                <button onClick={async () => {
                                                    if (!newAddress.label?.trim() || !newAddress.address?.trim()) return
                                                    try {
                                                        const created = await createCustomerAddress({ ...newAddress, customer_id: customer.id } as CustomerAddressInput)
                                                        setAddresses(prev => [...prev, created])
                                                        setNewAddress({ label: '', address: '', gps_lat: null, gps_lng: null, is_default: false })
                                                        setAddingAddress(false)
                                                        toast.success('تمت الإضافة')
                                                    } catch { toast.error('فشلت الإضافة') }
                                                }} disabled={!newAddress.label?.trim() || !newAddress.address?.trim()} className="btn btn-primary btn-sm">
                                                    حفظ
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setAddingAddress(true)} className="btn btn-ghost w-full text-primary-600">
                                            <Plus className="h-4 w-4" /> إضافة عنوان
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.name?.trim() || (isTaxRequired && !form.tax_registration_number?.trim())}
                        className="btn btn-primary"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {customer ? 'تحديث' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    )
}
