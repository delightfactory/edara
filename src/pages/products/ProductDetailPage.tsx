import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Package, ArrowRight, Loader2, Pencil,
    Tag, Layers, BarChart3,
    Receipt, ImageIcon, Clock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getProduct, getProductUnits, updateProduct, getCategories, getBrands, getUnits } from '@/lib/services/products'
import type { ProductWithRefs, ProductUnitWithRef, ProductInput, Category, Brand, Unit } from '@/lib/types/products'
import { ProductFormDialog } from '@/components/modules/products/ProductFormDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function ProductDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { can } = useAuthStore()
    usePageTitle('تفاصيل المنتج')

    const [product, setProduct] = useState<ProductWithRefs | null>(null)
    const [productUnits, setProductUnits] = useState<ProductUnitWithRef[]>([])
    const [loading, setLoading] = useState(true)

    // Form dialog state
    const [showForm, setShowForm] = useState(false)
    const [formSaving, setFormSaving] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [units, setUnits] = useState<Unit[]>([])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([
            getProduct(id),
            getProductUnits(id),
        ]).then(([p, pu]) => {
            setProduct(p)
            setProductUnits(pu)
        }).catch(() => {
            toast.error('فشل تحميل بيانات المنتج')
        }).finally(() => setLoading(false))
    }, [id])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(val)

    const openEditDialog = () => {
        Promise.all([
            getCategories({ is_active: true }),
            getBrands(),
            getUnits(),
        ]).then(([cats, brs, uns]) => {
            setCategories(cats)
            setBrands(brs)
            setUnits(uns)
        }).catch(() => {})
        setShowForm(true)
    }

    const handleFormSave = async (data: Partial<ProductInput>, isEdit: boolean) => {
        if (!isEdit || !product) return
        setFormSaving(true)
        try {
            await updateProduct(product.id, data)
            toast.success('تم تحديث بيانات المنتج')
            setShowForm(false)
            const updated = await getProduct(product.id)
            setProduct(updated)
        } catch {
            toast.error('فشل تحديث المنتج')
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

    if (!product) {
        return (
            <div className="text-center py-20 space-y-3">
                <Package className="h-12 w-12 mx-auto" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-muted)' }}>المنتج غير موجود</p>
                <button onClick={() => navigate('/products')} className="btn btn-secondary btn-sm">
                    <ArrowRight className="h-4 w-4" /> العودة للمنتجات
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/products')}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30"
                        title="العودة للمنتجات">
                        <ArrowRight className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
                    </button>
                    <div>
                        <h1 className="page-title">{product.name}</h1>
                        <p className="page-subtitle">
                            {product.sku && <span>{product.sku}</span>}
                            {product.barcode && <span> • {product.barcode}</span>}
                        </p>
                    </div>
                </div>
                {can('products.products.update') && (
                    <button onClick={openEditDialog} className="btn btn-primary">
                        <Pencil className="h-4 w-4" /> تعديل
                    </button>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Product Image */}
                <div className="edara-card p-5 flex flex-col items-center justify-center" style={{ minHeight: '12rem' }}>
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name}
                            className="max-h-40 rounded-xl object-contain" />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                            <ImageIcon className="h-12 w-12" style={{ color: 'var(--text-muted)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>لا توجد صورة</span>
                        </div>
                    )}
                </div>

                {/* Pricing */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Receipt className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>الأسعار</h3>
                    </div>
                    <InfoRow label="سعر التكلفة" value={formatCurrency(product.cost_price)} />
                    <InfoRow label="سعر البيع" value={formatCurrency(product.selling_price)} />
                    <InfoRow label="هامش الربح"
                        value={product.cost_price > 0
                            ? `${(((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%`
                            : '—'}
                        valueColor="var(--color-success)" />
                    <InfoRow label="خاضع للضريبة" value={product.is_taxable ? `نعم (${product.tax_percentage}%)` : 'لا'} />
                </div>

                {/* Classification */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>التصنيف</h3>
                    </div>
                    <InfoRow label="التصنيف" value={product.category?.name} />
                    <InfoRow label="العلامة التجارية" value={product.brand?.name} />
                    <InfoRow label="الوحدة" value={product.unit ? `${product.unit.name} (${product.unit.symbol})` : null} />
                    <InfoRow label="الحالة" value={product.is_active ? 'نشط' : 'معطّل'}
                        valueColor={product.is_active ? 'var(--color-success)' : 'var(--color-danger)'} />
                </div>
            </div>

            {/* Stock & Batches */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Stock Settings */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>إعدادات المخزون</h3>
                    </div>
                    <InfoRow label="الحد الأدنى" value={product.min_stock.toString()} />
                    <InfoRow label="الحد الأقصى" value={product.max_stock.toString()} />
                    <InfoRow label="تتبع الدفعات" value={product.has_batches ? 'نعم' : 'لا'} />
                    <InfoRow label="يتطلب تاريخ صلاحية" value={product.requires_expiry ? 'نعم' : 'لا'} />
                </div>

                {/* Alternative Units */}
                <div className="edara-card">
                    <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--divider-color)' }}>
                        <Layers className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            الوحدات البديلة ({productUnits.length})
                        </h3>
                    </div>
                    {productUnits.length === 0 ? (
                        <div className="p-8 text-center">
                            <Layers className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>لا توجد وحدات بديلة</p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--divider-color)' }}>
                            {productUnits.map(pu => (
                                <div key={pu.id} className="flex items-center justify-between px-5 py-3">
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {pu.unit?.name || '—'} ({pu.unit?.symbol})
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            معامل التحويل: {pu.conversion_factor}
                                            {pu.barcode && ` • باركود: ${pu.barcode}`}
                                        </p>
                                    </div>
                                    {pu.selling_price && (
                                        <span className="text-sm font-bold" style={{ color: 'var(--color-primary-600)' }}>
                                            {formatCurrency(pu.selling_price)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            {product.description && (
                <div className="edara-card p-5">
                    <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>الوصف</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
                </div>
            )}

            {/* Timestamps */}
            <div className="edara-card p-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>تاريخ الإنشاء: {new Date(product.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {product.updated_at && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>آخر تحديث: {new Date(product.updated_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                )}
            </div>

            <ProductFormDialog
                open={showForm} product={product}
                categories={categories} brands={brands} units={units}
                saving={formSaving}
                onClose={() => setShowForm(false)} onSave={handleFormSave}
            />
        </div>
    )
}

function InfoRow({ label, value, dir, valueColor }: {
    label: string; value?: string | null; dir?: string; valueColor?: string
}) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className="text-sm font-medium" dir={dir} style={{ color: valueColor || 'var(--text-primary)' }}>
                {value || '—'}
            </span>
        </div>
    )
}
