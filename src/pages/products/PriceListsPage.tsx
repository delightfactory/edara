import { useState, useEffect } from 'react'
import { DollarSign, Plus, Pencil, Trash2, Loader2, Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
    getPriceLists, createPriceList, updatePriceList, deletePriceList,
    getPriceListItems, upsertPriceListItem, deletePriceListItem,
    getProducts,
} from '@/lib/services/products'
import type {
    PriceList, PriceListInput,
    PriceListItemWithProduct, PriceListItemInput,
    ProductWithRefs,
} from '@/lib/types/products'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function PriceListsPage() {
    usePageTitle('قوائم الأسعار')
    const { can } = useAuthStore()
    const [lists, setLists] = useState<PriceList[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<PriceList | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    // Detail
    const [selectedList, setSelectedList] = useState<PriceList | null>(null)
    const [items, setItems] = useState<PriceListItemWithProduct[]>([])
    const [loadingItems, setLoadingItems] = useState(false)
    const [products, setProducts] = useState<ProductWithRefs[]>([])

    // Add item
    const [showAddItem, setShowAddItem] = useState(false)
    const [addItemProductId, setAddItemProductId] = useState('')
    const [addItemPrice, setAddItemPrice] = useState(0)
    const [addItemMinQty, setAddItemMinQty] = useState(1)
    const [savingItem, setSavingItem] = useState(false)

    // Form
    const [formName, setFormName] = useState('')
    const [formIsDefault, setFormIsDefault] = useState(false)
    const [formIsActive, setFormIsActive] = useState(true)

    const loadLists = async () => {
        setLoading(true)
        try { setLists(await getPriceLists()) }
        catch { toast.error('حدث خطأ في تحميل قوائم الأسعار') }
        finally { setLoading(false) }
    }

    useEffect(() => { loadLists() }, [])

    const openCreate = () => { setEditing(null); setFormName(''); setFormIsDefault(false); setFormIsActive(true); setShowForm(true) }
    const openEdit = (pl: PriceList) => { setEditing(pl); setFormName(pl.name); setFormIsDefault(pl.is_default); setFormIsActive(pl.is_active); setShowForm(true) }

    const handleSave = async () => {
        if (!formName.trim()) { toast.error('يرجى إدخال اسم القائمة'); return }
        setSaving(true)
        try {
            const data: Partial<PriceListInput> = { name: formName, is_default: formIsDefault, is_active: formIsActive }
            if (editing) { await updatePriceList(editing.id, data); toast.success('تم تحديث قائمة الأسعار') }
            else { await createPriceList(data); toast.success('تم إنشاء قائمة الأسعار') }
            setShowForm(false); loadLists()
        } catch { toast.error('فشل حفظ قائمة الأسعار') }
        finally { setSaving(false) }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try { await deletePriceList(id); toast.success('تم حذف القائمة'); if (selectedList?.id === id) setSelectedList(null); loadLists() }
        catch { toast.error('فشل الحذف — قد تكون مرتبطة بعملاء') }
        finally { setDeleting(null) }
    }

    const openDetail = async (pl: PriceList) => {
        setSelectedList(pl); setLoadingItems(true)
        try {
            const [itemsData, productsData] = await Promise.all([
                getPriceListItems(pl.id),
                getProducts({ pageSize: 500 }).then(r => r.data),
            ])
            setItems(itemsData); setProducts(productsData)
        } catch { toast.error('حدث خطأ في تحميل بنود القائمة') }
        finally { setLoadingItems(false) }
    }

    const handleAddItem = async () => {
        if (!addItemProductId || !selectedList) { toast.error('اختر منتجاً'); return }
        setSavingItem(true)
        try {
            await upsertPriceListItem({ price_list_id: selectedList.id, product_id: addItemProductId, price: Number(addItemPrice) || 0, min_qty: Number(addItemMinQty) || 1 } as PriceListItemInput)
            toast.success('تم إضافة/تحديث البند')
            setShowAddItem(false); setAddItemProductId(''); setAddItemPrice(0); setAddItemMinQty(1)
            openDetail(selectedList)
        } catch { toast.error('فشل إضافة البند') }
        finally { setSavingItem(false) }
    }

    const handleDeleteItem = async (id: string) => {
        if (!selectedList) return
        try { await deletePriceListItem(id); toast.success('تم حذف البند'); openDetail(selectedList) }
        catch { toast.error('فشل حذف البند') }
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 2 }).format(val)

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">قوائم الأسعار</h1>
                        <p className="page-subtitle">{lists.length} قائمة</p>
                    </div>
                </div>
                {can('products.prices.create') && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة قائمة
                    </button>
                )}
            </div>

            {/* Lists table */}
            <div className="edara-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: '400px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>اسم القائمة</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>نوع</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                                {can('products.prices.update') && <th className="px-4 py-3 w-28"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                    </tr>
                                ))
                            ) : lists.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                                <DollarSign className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>لا توجد قوائم أسعار</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                lists.map((pl, i) => (
                                    <tr key={pl.id} className="edara-tr-hover transition-all duration-200" style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}>
                                        <td className="px-4 py-3">
                                            <button onClick={() => openDetail(pl)} className="text-sm font-semibold hover:text-primary-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
                                                {pl.name}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            {pl.is_default ? <span className="badge badge-primary">افتراضي</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>مخصص</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('badge', pl.is_active ? 'badge-success' : 'badge-danger')}>{pl.is_active ? 'نشط' : 'معطّل'}</span>
                                        </td>
                                        {can('products.prices.update') && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openDetail(pl)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="عرض البنود">
                                                        <Eye className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    <button onClick={() => openEdit(pl)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                        <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    {!pl.is_default && (
                                                        <button onClick={() => setConfirmId(pl.id)} disabled={deleting === pl.id} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                            {deleting === pl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail: Price list items */}
            {selectedList && (
                <div className="edara-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3" style={{ borderBottom: '1px solid var(--divider-color)' }}>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            بنود قائمة: {selectedList.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            {can('products.prices.update') && (
                                <button onClick={() => setShowAddItem(!showAddItem)} className="btn btn-primary btn-sm">
                                    <Plus className="h-3 w-3" /> إضافة بند
                                </button>
                            )}
                            <button onClick={() => setSelectedList(null)} className="btn btn-ghost btn-icon">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {showAddItem && (
                        <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row gap-3" style={{ borderBottom: '1px solid var(--divider-color)', backgroundColor: 'var(--empty-bg)' }}>
                            <select value={addItemProductId} onChange={e => setAddItemProductId(e.target.value)} className="form-input" style={{ flex: 1 }}>
                                <option value="">— اختر منتج —</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'بدون كود'})</option>)}
                            </select>
                            <input type="number" value={addItemPrice || ''} onChange={e => setAddItemPrice(Number(e.target.value))} placeholder="السعر" className="form-input" style={{ width: '7rem' }} dir="ltr" min={0} step="0.01" />
                            <input type="number" value={addItemMinQty} onChange={e => setAddItemMinQty(Number(e.target.value))} placeholder="حد أدنى" className="form-input" style={{ width: '5rem' }} dir="ltr" min={1} />
                            <div className="flex gap-2">
                                <button onClick={handleAddItem} disabled={savingItem} className="btn btn-primary btn-sm">
                                    {savingItem ? <Loader2 className="h-3 w-3 animate-spin" /> : 'حفظ'}
                                </button>
                                <button onClick={() => setShowAddItem(false)} className="btn btn-secondary btn-sm">إلغاء</button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full" style={{ minWidth: '400px' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>السعر</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>حد أدنى كمية</th>
                                    {can('products.prices.update') && <th className="px-4 py-3 w-14"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loadingItems ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                            <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                                            <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                            <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                        </tr>
                                    ))
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center">
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد بنود في هذه القائمة</p>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, i) => (
                                        <tr key={item.id} className="edara-tr-hover transition-all duration-200" style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}>
                                            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {item.product?.name || item.product_id}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold tabular-nums" dir="ltr" style={{ color: 'var(--text-primary)' }}>
                                                {formatCurrency(item.price)}
                                            </td>
                                            <td className="px-4 py-3 text-xs tabular-nums" dir="ltr" style={{ color: 'var(--text-muted)' }}>
                                                {item.min_qty}
                                            </td>
                                            {can('products.prices.update') && (
                                                <td className="px-4 py-3">
                                                    <button onClick={() => handleDeleteItem(item.id)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                        <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Dialog */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] overflow-hidden"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                        {/* Gradient Header */}
                        <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editing ? 'تعديل قائمة أسعار' : 'إضافة قائمة أسعار'}</h2>
                                        <p className="text-xs text-primary-200 mt-0.5">{editing ? `تعديل ${editing.name}` : 'أدخل بيانات القائمة'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم القائمة *</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="form-input" placeholder="مثال: أسعار الجملة" />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer px-1">
                                <input type="checkbox" checked={formIsDefault} onChange={e => setFormIsDefault(e.target.checked)} className="rounded" />
                                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>قائمة افتراضية</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer px-1">
                                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>نشطة</span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                            <button onClick={handleSave} disabled={saving || !formName.trim()} className="btn btn-primary">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editing ? 'تحديث' : 'إنشاء'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!confirmId} title="حذف قائمة الأسعار" message="هل أنت متأكد من حذف هذه القائمة؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />
        </div>
    )
}
