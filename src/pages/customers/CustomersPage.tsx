import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HandshakeIcon, Plus, Search, Filter, Download, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/services/customers'
import { getProfileLookups } from '@/lib/services/inventory'
import { getPriceLists } from '@/lib/services/products'
import type { CustomerWithRefs, CustomerInput, CustomerFilters, CustomerType, CustomerClassification } from '@/lib/types/customers'
import { CUSTOMER_TYPE_LABELS, CLASSIFICATION_LABELS } from '@/lib/types/customers'
import type { ProfileLookup } from '@/lib/types/inventory'
import type { PriceList } from '@/lib/types/products'
import { CustomersTable } from '@/components/modules/customers/CustomersTable'
import { CustomerFormDialog } from '@/components/modules/customers/CustomerFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { exportToCSV } from '@/lib/utils/exportCSV'
import { toast } from 'sonner'

export function CustomersPage() {
    usePageTitle('العملاء')
    const { can } = useAuthStore()
    const navigate = useNavigate()

    // Lookups
    const [profiles, setProfiles] = useState<ProfileLookup[]>([])
    const [priceLists, setPriceLists] = useState<PriceList[]>([])

    // Data
    const [customers, setCustomers] = useState<CustomerWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterType, setFilterType] = useState('')
    const [filterClassification, setFilterClassification] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<CustomerWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onEscape: () => { if (showForm) setShowForm(false); else if (confirmId) setConfirmId(null) },
        onSearch: () => searchRef.current?.focus(),
    })

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        Promise.all([
            getProfileLookups(),
            getPriceLists(),
        ]).then(([p, pl]) => {
            setProfiles(p)
            setPriceLists(pl)
        }).catch(() => { })
    }, [])

    const loadCustomers = useCallback(async () => {
        setLoading(true)
        try {
            const filters: CustomerFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                customer_type: filterType || undefined,
                classification: filterClassification || undefined,
            }
            const result = await getCustomers(filters)
            setCustomers(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل العملاء')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterType, filterClassification])

    useEffect(() => { loadCustomers() }, [loadCustomers])

    // Handle edit from detail page
    const location = useLocation()
    useEffect(() => {
        const editId = (location.state as { editId?: string } | null)?.editId
        if (editId && customers.length > 0) {
            const customer = customers.find(c => c.id === editId)
            if (customer) {
                setEditing(customer)
                setShowForm(true)
            }
            window.history.replaceState({}, '')
        }
    }, [location.state, customers])

    const handleSave = async (data: Partial<CustomerInput>, isEdit: boolean) => {
        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم العميل'); return }
        setSaving(true)
        try {
            if (isEdit && editing) {
                await updateCustomer(editing.id, data)
                toast.success('تم تحديث بيانات العميل')
            } else {
                await createCustomer(data)
                toast.success('تم إنشاء العميل بنجاح')
            }
            setShowForm(false)
            loadCustomers()
        } catch {
            toast.error(isEdit ? 'فشل تحديث العميل' : 'فشل إنشاء العميل')
        } finally {
            setSaving(false)
        }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteCustomer(id)
            toast.success('تم حذف العميل')
            loadCustomers()
        } catch {
            toast.error('فشل الحذف — قد يكون مرتبطاً بطلبات أو فواتير')
        } finally {
            setDeleting(null)
        }
    }

    const openCreate = () => { setEditing(null); setShowForm(true) }
    const openEdit = (c: CustomerWithRefs) => { setEditing(c); setShowForm(true) }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <HandshakeIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">العملاء</h1>
                        <p className="page-subtitle">{total} عميل في النظام</p>
                    </div>
                </div>
                {can('crm.customers.create') && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportToCSV(customers, [
                            { key: 'name', label: 'الاسم' },
                            { key: 'code', label: 'الكود' },
                            { key: 'phone', label: 'الهاتف' },
                            { key: 'customer_type', label: 'النوع' },
                            { key: 'credit_limit', label: 'حد الائتمان' },
                            { key: 'current_balance', label: 'الرصيد' },
                        ], 'العملاء')} className="btn btn-secondary" title="تصدير CSV">
                            <Download className="h-4 w-4" />
                        </button>
                        <button onClick={openCreate} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> إضافة عميل
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث بالاسم أو الكود أو الهاتف..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الأنواع</option>
                            {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative" style={{ minWidth: '8rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterClassification} onChange={e => { setFilterClassification(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل التصنيفات</option>
                            {(Object.entries(CLASSIFICATION_LABELS) as [CustomerClassification, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {/* Clear filters */}
                    {(search || filterType || filterClassification) && (
                        <button onClick={() => { setSearch(''); setFilterType(''); setFilterClassification(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح الفلاتر
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <CustomersTable
                customers={customers} loading={loading}
                page={page} totalPages={totalPages} total={total}
                canUpdate={can('crm.customers.update')}
                canDelete={can('crm.customers.delete')}
                canCreate={can('crm.customers.create')}
                deleting={deleting} search={search}
                hasFilters={!!filterType || !!filterClassification}
                onEdit={openEdit} onDelete={id => setConfirmId(id)}
                onPageChange={setPage} onCreateFirst={openCreate}
                onRowClick={id => navigate(`/crm/customers/${id}`)}
            />

            <ConfirmDialog open={!!confirmId} title="حذف العميل" message="هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {/* Form Dialog */}
            <CustomerFormDialog
                open={showForm} customer={editing}
                profiles={profiles}
                priceLists={priceLists.map(pl => ({ id: pl.id, name: pl.name }))}
                saving={saving}
                onClose={() => setShowForm(false)} onSave={handleSave}
            />
        </div >
    )
}
