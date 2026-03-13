import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Building2, Plus, Search, Download, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import {
    getSuppliers, createSupplier, updateSupplier, deleteSupplier,
    getActiveBrands,
} from '@/lib/services/suppliers'
import type { SupplierWithRefs, SupplierInput, SupplierFilters, BrandLookup } from '@/lib/types/suppliers'
import { SuppliersTable } from '@/components/modules/suppliers/SuppliersTable'
import { SupplierFormDialog } from '@/components/modules/suppliers/SupplierFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { exportToCSV } from '@/lib/utils/exportCSV'
import { toast } from 'sonner'

export function SuppliersPage() {
    usePageTitle('الموردين')
    const { can } = useAuthStore()
    const navigate = useNavigate()

    // Lookups
    const [allBrands, setAllBrands] = useState<BrandLookup[]>([])

    // Data
    const [suppliers, setSuppliers] = useState<SupplierWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<SupplierWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)
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

        getActiveBrands().then(b => setAllBrands(b)).catch(() => { })
    }, [])

    const loadSuppliers = useCallback(async () => {
        setLoading(true)
        try {
            const filters: SupplierFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
            }
            const result = await getSuppliers(filters)
            setSuppliers(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل الموردين')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch])

    useEffect(() => { loadSuppliers() }, [loadSuppliers])

    // Handle edit from detail page
    const location = useLocation()
    useEffect(() => {
        const editId = (location.state as { editId?: string } | null)?.editId
        if (editId && suppliers.length > 0) {
            const supplier = suppliers.find(s => s.id === editId)
            if (supplier) {
                setEditing(supplier)
                setShowForm(true)
            }
            window.history.replaceState({}, '')
        }
    }, [location.state, suppliers])

    const handleSave = async (data: Partial<SupplierInput>, brandIds: string[], isEdit: boolean) => {
        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم المورد'); return }
        setSaving(true)
        try {
            if (isEdit && editing) {
                await updateSupplier(editing.id, data, brandIds)
                toast.success('تم تحديث بيانات المورد')
            } else {
                await createSupplier(data, brandIds)
                toast.success('تم إنشاء المورد بنجاح')
            }
            setShowForm(false)
            loadSuppliers()
        } catch {
            toast.error(isEdit ? 'فشل تحديث المورد' : 'فشل إنشاء المورد')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setDeleting(id)
        setConfirmId(null)
        try {
            await deleteSupplier(id)
            toast.success('تم حذف المورد')
            loadSuppliers()
        } catch {
            toast.error('فشل الحذف — قد يكون مرتبطاً بأوامر شراء')
        } finally {
            setDeleting(null)
        }
    }

    const openCreate = () => { setEditing(null); setShowForm(true) }
    const openEdit = (s: SupplierWithRefs) => { setEditing(s); setShowForm(true) }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">الموردين</h1>
                        <p className="page-subtitle">{total} مورد في النظام</p>
                    </div>
                </div>
                {can('purchases.suppliers.create') && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportToCSV(suppliers, [
                            { key: 'name', label: 'الاسم' },
                            { key: 'code', label: 'الكود' },
                            { key: 'phone', label: 'الهاتف' },
                            { key: 'email', label: 'البريد' },
                            { key: 'payment_terms', label: 'شروط الدفع' },
                        ], 'الموردين')} className="btn btn-secondary" title="تصدير CSV">
                            <Download className="h-4 w-4" />
                        </button>
                        <button onClick={openCreate} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> إضافة مورد
                        </button>
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث بالاسم أو الكود أو الهاتف..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    {search && (
                        <button onClick={() => { setSearch(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح البحث
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <SuppliersTable
                suppliers={suppliers} loading={loading}
                page={page} totalPages={totalPages} total={total}
                canUpdate={can('purchases.suppliers.update')}
                canDelete={can('purchases.suppliers.delete')}
                canCreate={can('purchases.suppliers.create')}
                deleting={deleting} search={search}
                onEdit={openEdit} onDelete={id => setConfirmId(id)}
                onPageChange={setPage} onCreateFirst={openCreate}
                onRowClick={id => navigate(`/purchases/suppliers/${id}`)}
            />

            {/* Confirm Delete */}
            <ConfirmDialog
                open={!!confirmId}
                title="حذف المورد"
                message="هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting}
                onConfirm={() => confirmId && handleDelete(confirmId)}
                onCancel={() => setConfirmId(null)}
            />

            {/* Form Dialog */}
            <SupplierFormDialog
                open={showForm} supplier={editing}
                allBrands={allBrands} saving={saving}
                onClose={() => setShowForm(false)} onSave={handleSave}
            />
        </div>
    )
}
