import { useState, useEffect } from 'react'
import {
    Package, X, Loader2, Beaker, Receipt,
    ToggleLeft, ToggleRight, Plus, Trash2, Layers, Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ProductWithRefs, ProductInput, Category, Brand, Unit, ProductUnitWithRef } from '@/lib/types/products'
import { getProductUnits, createProductUnit, updateProductUnit, deleteProductUnit } from '@/lib/services/products'
import { ImageUploadField } from '@/components/ui/ImageUploadField'

interface ProductFormDialogProps {
    open: boolean
    product: ProductWithRefs | null
    categories: Category[]
    brands: Brand[]
    units: Unit[]
    saving: boolean
    canViewCost?: boolean
    canEditCost?: boolean
    onClose: () => void
    onSave: (data: Partial<ProductInput>, isEdit: boolean) => void
}

export function ProductFormDialog({
    open, product, categories, brands, units, saving,
    canViewCost = true, canEditCost = true,
    onClose, onSave,
}: ProductFormDialogProps) {
    const [form, setForm] = useState<Partial<ProductInput>>({})
    const [altUnits, setAltUnits] = useState<ProductUnitWithRef[]>([])
    const [newUnit, setNewUnit] = useState({ unit_id: '', conversion_factor: 1, barcode: '', selling_price: 0 })
    const [addingUnit, setAddingUnit] = useState(false)
    const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
    const [editUnitForm, setEditUnitForm] = useState({ conversion_factor: 1, barcode: '', selling_price: 0 })

    useEffect(() => {
        if (open) {
            if (product) {
                setForm({
                    name: product.name,
                    sku: product.sku || '',
                    barcode: product.barcode || '',
                    description: product.description || '',
                    image_url: product.image_url || null,
                    category_id: product.category_id || undefined,
                    brand_id: product.brand_id || undefined,
                    unit_id: product.unit_id || undefined,
                    cost_price: product.cost_price,
                    selling_price: product.selling_price,
                    min_stock: product.min_stock,
                    max_stock: product.max_stock,
                    has_batches: product.has_batches,
                    requires_expiry: product.requires_expiry,
                    is_taxable: product.is_taxable,
                    tax_percentage: product.tax_percentage,
                    is_active: product.is_active,
                })
                getProductUnits(product.id).then(setAltUnits).catch(() => { })
            } else {
                setForm({
                    name: '', sku: '', barcode: '', description: '', image_url: null,
                    category_id: undefined, brand_id: undefined, unit_id: undefined,
                    cost_price: 0, selling_price: 0, min_stock: 0, max_stock: 0,
                    has_batches: false, requires_expiry: false,
                    is_taxable: true, tax_percentage: 14, is_active: true,
                })
                setAltUnits([])
            }
        }
    }, [open, product])

    const handleAddUnit = async () => {
        if (!product || !newUnit.unit_id) return
        setAddingUnit(true)
        try {
            await createProductUnit({
                product_id: product.id,
                unit_id: newUnit.unit_id,
                conversion_factor: Number(newUnit.conversion_factor) || 1,
                barcode: newUnit.barcode || null,
                selling_price: Number(newUnit.selling_price) || null,
            })
            const updated = await getProductUnits(product.id)
            setAltUnits(updated)
            setNewUnit({ unit_id: '', conversion_factor: 1, barcode: '', selling_price: 0 })
            toast.success('تمت إضافة الوحدة البديلة')
        } catch {
            toast.error('فشل إضافة الوحدة')
        } finally { setAddingUnit(false) }
    }

    const handleDeleteUnit = async (id: string) => {
        try {
            await deleteProductUnit(id)
            setAltUnits(prev => prev.filter(u => u.id !== id))
            toast.success('تم حذف الوحدة')
        } catch { toast.error('فشل الحذف') }
    }

    const startEditUnit = (pu: ProductUnitWithRef) => {
        setEditingUnitId(pu.id)
        setEditUnitForm({
            conversion_factor: pu.conversion_factor,
            barcode: pu.barcode || '',
            selling_price: pu.selling_price || 0,
        })
    }

    const handleUpdateUnit = async () => {
        if (!editingUnitId) return
        try {
            await updateProductUnit(editingUnitId, {
                conversion_factor: Number(editUnitForm.conversion_factor) || 1,
                barcode: editUnitForm.barcode || null,
                selling_price: Number(editUnitForm.selling_price) || null,
            })
            if (product) {
                const updated = await getProductUnits(product.id)
                setAltUnits(updated)
            }
            setEditingUnitId(null)
            toast.success('تم تحديث الوحدة')
        } catch { toast.error('فشل التحديث') }
    }

    const handleSubmit = () => {
        const payload = {
            ...form,
            category_id: form.category_id || null,
            brand_id: form.brand_id || null,
            unit_id: form.unit_id || null,
            cost_price: Number(form.cost_price) || 0,
            selling_price: Number(form.selling_price) || 0,
            min_stock: Number(form.min_stock) || 0,
            max_stock: Number(form.max_stock) || 0,
            tax_percentage: Number(form.tax_percentage) || 0,
        }
        onSave(payload, !!product)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh] p-4">
            {/* Overlay */}
            <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

            <div
                className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out]"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
                {/* Gradient Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">
                                    {product ? 'تعديل منتج' : 'إضافة منتج جديد'}
                                </h2>
                                <p className="text-xs text-primary-200 mt-0.5">
                                    {product ? `تعديل بيانات ${product.name}` : 'أدخل بيانات المنتج الجديد'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-5">
                    {/* Basic info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم المنتج *</label>
                            <input
                                type="text"
                                value={form.name || ''}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="form-input"
                                placeholder="مثال: شامبو سيارات كريستال"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>كود المنتج (SKU)</label>
                            <input
                                type="text"
                                value={form.sku || ''}
                                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                className="form-input" dir="ltr" placeholder="PRD-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الباركود</label>
                            <input
                                type="text"
                                value={form.barcode || ''}
                                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                                className="form-input" dir="ltr" placeholder="6281234567890"
                            />
                        </div>
                    </div>

                    {/* Product Image */}
                    <ImageUploadField
                        value={form.image_url}
                        onChange={(url) => setForm(f => ({ ...f, image_url: url }))}
                        bucket="product-images"
                        folder="products"
                        label="صورة المنتج"
                    />

                    {/* Lookups */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>التصنيف</label>
                            <select value={form.category_id || ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || undefined }))} className="form-input">
                                <option value="">— بدون —</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>العلامة التجارية</label>
                            <select value={form.brand_id || ''} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value || undefined }))} className="form-input">
                                <option value="">— بدون —</option>
                                {brands.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>وحدة القياس</label>
                            <select value={form.unit_id || ''} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value || undefined }))} className="form-input">
                                <option value="">— اختر —</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الوصف</label>
                        <textarea
                            value={form.description || ''}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="form-input"
                            style={{ height: '5rem', resize: 'none' }}
                            placeholder="وصف اختياري للمنتج..."
                        />
                    </div>

                    <div className="edara-divider" />

                    {/* Pricing */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {canViewCost && (
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>سعر التكلفة</label>
                                <input type="number" value={form.cost_price || 0} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))} className="form-input" dir="ltr" min={0} step="0.01" readOnly={!canEditCost} />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>سعر البيع</label>
                            <input type="number" value={form.selling_price || 0} onChange={e => setForm(f => ({ ...f, selling_price: Number(e.target.value) }))} className="form-input" dir="ltr" min={0} step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>حد أدنى مخزون</label>
                            <input type="number" value={form.min_stock || 0} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} className="form-input" dir="ltr" min={0} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>حد أقصى مخزون</label>
                            <input type="number" value={form.max_stock || 0} onChange={e => setForm(f => ({ ...f, max_stock: Number(e.target.value) }))} className="form-input" dir="ltr" min={0} />
                        </div>
                    </div>

                    <div className="edara-divider" />

                    {/* Feature toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ToggleCard icon={<Beaker className="h-4 w-4" />} label="تتبع التشغيلات" description="أرقام Batch لكل دفعة إنتاج"
                            checked={!!form.has_batches} onChange={() => setForm(f => ({ ...f, has_batches: !f.has_batches, requires_expiry: !f.has_batches ? f.requires_expiry : false }))} />
                        <ToggleCard icon={<Package className="h-4 w-4" />} label="تاريخ صلاحية" description="تتبع انتهاء الصلاحية (FEFO)"
                            checked={!!form.requires_expiry} disabled={!form.has_batches} onChange={() => setForm(f => ({ ...f, requires_expiry: !f.requires_expiry }))} />
                        <ToggleCard icon={<Receipt className="h-4 w-4" />} label="خاضع للضريبة" description="ضريبة القيمة المضافة"
                            checked={!!form.is_taxable} onChange={() => setForm(f => ({ ...f, is_taxable: !f.is_taxable }))} />
                        {form.is_taxable && (
                            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>نسبة الضريبة %</label>
                                <input type="number" value={form.tax_percentage || 14} onChange={e => setForm(f => ({ ...f, tax_percentage: Number(e.target.value) }))} className="form-input" style={{ width: '5rem' }} dir="ltr" min={0} max={100} step="0.5" />
                            </div>
                        )}
                        <ToggleCard icon={<Package className="h-4 w-4" />} label="حالة المنتج"
                            description={form.is_active ? 'نشط — يظهر في المبيعات' : 'معطّل — لا يظهر'}
                            checked={!!form.is_active} activeColor="text-success" onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
                    </div>

                    {/* Product Units — edit mode only */}
                    {product && (
                        <>
                            <div className="edara-divider" />
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Layers className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>الوحدات البديلة</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>
                                        {altUnits.length}
                                    </span>
                                </div>
                                {altUnits.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {altUnits.map(pu => (
                                            editingUnitId === pu.id ? (
                                                <div key={pu.id} className="rounded-xl p-3 border space-y-2" style={{ borderColor: 'var(--color-primary-300)', backgroundColor: 'var(--empty-bg)' }}>
                                                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{pu.unit?.name} ({pu.unit?.symbol})</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>معامل تحويل</label>
                                                            <input type="number" value={editUnitForm.conversion_factor} onChange={e => setEditUnitForm(f => ({ ...f, conversion_factor: Number(e.target.value) }))} className="form-input text-sm py-1.5" dir="ltr" min={1} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>باركود</label>
                                                            <input type="text" value={editUnitForm.barcode} onChange={e => setEditUnitForm(f => ({ ...f, barcode: e.target.value }))} className="form-input text-sm py-1.5" dir="ltr" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>سعر بيع</label>
                                                            <input type="number" value={editUnitForm.selling_price} onChange={e => setEditUnitForm(f => ({ ...f, selling_price: Number(e.target.value) }))} className="form-input text-sm py-1.5" dir="ltr" min={0} step="0.01" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditingUnitId(null)} className="btn btn-secondary btn-sm text-xs">إلغاء</button>
                                                        <button onClick={handleUpdateUnit} className="btn btn-primary btn-sm text-xs">حفظ</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={pu.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {pu.unit?.name || 'وحدة'}
                                                        </span>
                                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({pu.unit?.symbol})</span>
                                                        <span className="text-xs badge badge-primary">×{pu.conversion_factor}</span>
                                                        {pu.barcode && <span className="text-[10px]" dir="ltr" style={{ color: 'var(--text-muted)' }}>{pu.barcode}</span>}
                                                        {pu.selling_price != null && <span className="text-xs font-medium" style={{ color: 'var(--color-primary-600)' }}>{pu.selling_price} ج.م</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => startEditUnit(pu)} className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30">
                                                            <Pencil className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                                        </button>
                                                        <button onClick={() => handleDeleteUnit(pu.id)} className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950/30">
                                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                                {/* Add new unit */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                                    <div>
                                        <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>الوحدة</label>
                                        <select value={newUnit.unit_id} onChange={e => setNewUnit(u => ({ ...u, unit_id: e.target.value }))} className="form-input text-sm py-1.5">
                                            <option value="">— اختر —</option>
                                            {units.filter(u => !altUnits.some(au => au.unit_id === u.id) && u.id !== form.unit_id).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>معامل تحويل</label>
                                        <input type="number" value={newUnit.conversion_factor} onChange={e => setNewUnit(u => ({ ...u, conversion_factor: Number(e.target.value) }))} className="form-input text-sm py-1.5" dir="ltr" min={1} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>باركود</label>
                                        <input type="text" value={newUnit.barcode} onChange={e => setNewUnit(u => ({ ...u, barcode: e.target.value }))} className="form-input text-sm py-1.5" dir="ltr" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>سعر بيع</label>
                                        <input type="number" value={newUnit.selling_price} onChange={e => setNewUnit(u => ({ ...u, selling_price: Number(e.target.value) }))} className="form-input text-sm py-1.5" dir="ltr" min={0} step="0.01" />
                                    </div>
                                    <button onClick={handleAddUnit} disabled={addingUnit || !newUnit.unit_id} className="btn btn-primary btn-sm">
                                        {addingUnit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                        إضافة
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving || !form.name?.trim()} className="btn btn-primary">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {product ? 'تحديث' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Reusable toggle card ─────────────────────────────────────
function ToggleCard({ icon, label, description, checked, disabled, activeColor, onChange }: {
    icon: React.ReactNode; label: string; description: string
    checked: boolean; disabled?: boolean; activeColor?: string
    onChange: () => void
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onChange}
            className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 text-right w-full",
                disabled && "opacity-40 cursor-not-allowed",
            )}
            style={{ backgroundColor: 'var(--empty-bg)' }}
        >
            <div className="flex items-center gap-3">
                <span style={{ color: checked ? 'var(--color-primary-600)' : 'var(--text-muted)' }}>{icon}</span>
                <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{description}</p>
                </div>
            </div>
            {checked ? (
                <ToggleRight className={cn("h-6 w-6", activeColor || "text-primary-600")} />
            ) : (
                <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
            )}
        </button>
    )
}
