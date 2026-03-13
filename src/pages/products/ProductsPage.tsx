import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Package, Plus, Search, Filter, Download, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import {
    getProducts, createProduct, updateProduct, deleteProduct,
    getCategories, getBrands, getUnits,
} from '@/lib/services/products'
import type {
    ProductWithRefs, ProductInput, ProductFilters,
    Category, Brand, Unit,
} from '@/lib/types/products'
import { ProductsTable } from '@/components/modules/products/ProductsTable'
import { ProductFormDialog } from '@/components/modules/products/ProductFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { exportToCSV } from '@/lib/utils/exportCSV'

export function ProductsPage() {
    usePageTitle('المنتجات')
    const { can } = useAuthStore()
    const navigate = useNavigate()

    // Lookups
    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [units, setUnits] = useState<Unit[]>([])

    // Data
    const [products, setProducts] = useState<ProductWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterCategory, setFilterCategory] = useState('')
    const [filterBrand, setFilterBrand] = useState('')
    const [filterActive, setFilterActive] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<ProductWithRefs | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onEscape: () => { if (showForm) setShowForm(false); else if (confirmId) setConfirmId(null) },
        onSearch: () => searchRef.current?.focus(),
    })
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        Promise.all([
            getCategories({ is_active: true }),
            getBrands(),
            getUnits(),
        ]).then(([cats, brs, uns]) => {
            setCategories(cats)
            setBrands(brs)
            setUnits(uns)
        }).catch(() => { })
    }, [])

    const loadProducts = useCallback(async () => {
        setLoading(true)
        try {
            const filters: ProductFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                category_id: filterCategory || undefined,
                brand_id: filterBrand || undefined,
                is_active: filterActive === '' ? undefined : filterActive === 'true',
            }
            const result = await getProducts(filters)
            setProducts(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل المنتجات')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterCategory, filterBrand, filterActive])

    useEffect(() => { loadProducts() }, [loadProducts])

    // Handle edit from detail page
    const location = useLocation()
    useEffect(() => {
        const editId = (location.state as { editId?: string } | null)?.editId
        if (editId && products.length > 0) {
            const product = products.find(p => p.id === editId)
            if (product) {
                setEditingProduct(product)
                setShowForm(true)
            }
            // Clear the state so it doesn't re-trigger
            window.history.replaceState({}, '')
        }
    }, [location.state, products])

    const handleSave = async (data: Partial<ProductInput>, isEdit: boolean) => {
        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم المنتج'); return }
        setSaving(true)
        try {
            if (isEdit && editingProduct) {
                await updateProduct(editingProduct.id, data)
                toast.success('تم تحديث المنتج بنجاح')
            } else {
                await createProduct(data)
                toast.success('تم إنشاء المنتج بنجاح')
            }
            setShowForm(false)
            loadProducts()
        } catch {
            toast.error(isEdit ? 'فشل تحديث المنتج' : 'فشل إنشاء المنتج')
        } finally {
            setSaving(false)
        }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteProduct(id)
            toast.success('تم حذف المنتج')
            loadProducts()
        } catch {
            toast.error('فشل حذف المنتج — قد يكون مرتبطاً ببيانات أخرى')
        } finally {
            setDeleting(null)
        }
    }

    const openCreate = () => { setEditingProduct(null); setShowForm(true) }
    const openEdit = (p: ProductWithRefs) => { setEditingProduct(p); setShowForm(true) }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Package className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">المنتجات</h1>
                        <p className="page-subtitle">{total} منتج في النظام</p>
                    </div>
                </div>
                {can('products.products.create') && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => {
                            const cols: { key: keyof ProductWithRefs; label: string }[] = [
                                { key: 'name', label: 'الاسم' },
                                { key: 'sku', label: 'الكود' },
                                { key: 'barcode', label: 'الباركود' },
                                ...(can('products.costs.read') ? [{ key: 'cost_price' as keyof ProductWithRefs, label: 'سعر التكلفة' }] : []),
                                { key: 'selling_price', label: 'سعر البيع' },
                            ]
                            exportToCSV(products, cols, 'المنتجات')
                        }} className="btn btn-secondary" title="تصدير CSV">
                            <Download className="h-4 w-4" />
                        </button>
                        <button onClick={openCreate} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> إضافة منتج
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input
                            ref={searchRef}
                            type="text" placeholder="بحث بالاسم أو الكود أو الباركود..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }}
                        />
                    </div>
                    <div className="relative" style={{ minWidth: '10rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }} className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل التصنيفات</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="relative" style={{ minWidth: '10rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterBrand} onChange={e => { setFilterBrand(e.target.value); setPage(1) }} className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل العلامات</option>
                            {brands.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="relative" style={{ minWidth: '8rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1) }} className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">الكل</option>
                            <option value="true">نشط</option>
                            <option value="false">معطّل</option>
                        </select>
                    </div>
                    {/* Clear filters */}
                    {(search || filterCategory || filterBrand || filterActive) && (
                        <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterBrand(''); setFilterActive(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح الفلاتر
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <ProductsTable
                products={products} loading={loading}
                page={page} totalPages={totalPages} total={total}
                canUpdate={can('products.products.update')}
                canDelete={can('products.products.delete')}
                canCreate={can('products.products.create')}
                canViewCost={can('products.costs.read')}
                deleting={deleting} search={search}
                hasFilters={!!filterCategory || !!filterBrand}
                onEdit={openEdit} onDelete={id => setConfirmId(id)}
                onPageChange={setPage} onCreateFirst={openCreate}
                onRowClick={id => navigate(`/products/${id}`)}
            />

            <ConfirmDialog open={!!confirmId} title="حذف المنتج" message="هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {/* Form Dialog */}
            <ProductFormDialog
                open={showForm} product={editingProduct}
                categories={categories} brands={brands} units={units}
                saving={saving}
                canViewCost={can('products.costs.read')}
                canEditCost={can('products.costs.update')}
                onClose={() => setShowForm(false)} onSave={handleSave}
            />
        </div>
    )
}
