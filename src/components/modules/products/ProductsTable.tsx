import {
    Package, Pencil, Trash2, Loader2, Plus,
    Barcode, Beaker, Receipt, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductWithRefs } from '@/lib/types/products'

interface ProductsTableProps {
    products: ProductWithRefs[]
    loading: boolean
    page: number
    totalPages: number
    total: number
    canUpdate: boolean
    canDelete: boolean
    canCreate: boolean
    canViewCost: boolean
    deleting: string | null
    search: string
    hasFilters: boolean
    onEdit: (product: ProductWithRefs) => void
    onDelete: (id: string) => void
    onPageChange: (page: number) => void
    onCreateFirst: () => void
    onRowClick: (id: string) => void
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 2 }).format(val)

export function ProductsTable({
    products, loading, page, totalPages, total,
    canUpdate, canDelete, canCreate, canViewCost, deleting,
    search, hasFilters,
    onEdit, onDelete, onPageChange, onCreateFirst, onRowClick,
}: ProductsTableProps) {
    return (
        <div className="edara-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '600px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكود</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>التصنيف</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>العلامة</th>
                            {canViewCost && <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>سعر التكلفة</th>}
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>سعر البيع</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الخصائص</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                            {canUpdate && <th className="px-4 py-3 w-20"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows />
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <Package className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                                            {search || hasFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد منتجات بعد'}
                                        </p>
                                        {!search && !hasFilters && canCreate && (
                                            <button onClick={onCreateFirst} className="btn btn-primary btn-sm mt-1">
                                                <Plus className="h-4 w-4" /> أضف أول منتج
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            products.map((product, i) => (
                                <tr
                                    key={product.id}
                                    className="edara-tr-hover transition-all duration-200 cursor-pointer"
                                    style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}
                                    onClick={() => onRowClick(product.id)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30 shrink-0">
                                                <Package className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                                                {product.unit && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{product.unit.name}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>{product.sku || '—'}</td>
                                    <td className="px-4 py-3">
                                        {product.category ? <span className="badge badge-info">{product.category.name}</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {product.brand ? <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{product.brand.name}</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    {canViewCost && <td className="px-4 py-3 text-xs tabular-nums" dir="ltr" style={{ color: 'var(--text-muted)' }}>{formatCurrency(product.cost_price)}</td>}
                                    <td className="px-4 py-3 text-xs font-semibold tabular-nums" dir="ltr" style={{ color: 'var(--text-primary)' }}>{formatCurrency(product.selling_price)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {product.has_batches && <span className="badge badge-warning text-[9px]"><Beaker className="h-2.5 w-2.5 inline ml-0.5" />تشغيلات</span>}
                                            {product.is_taxable && <span className="badge badge-primary text-[9px]"><Receipt className="h-2.5 w-2.5 inline ml-0.5" />{product.tax_percentage}%</span>}
                                            {product.barcode && <span className="badge badge-info text-[9px]"><Barcode className="h-2.5 w-2.5" /></span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('badge', product.is_active ? 'badge-success' : 'badge-danger')}>{product.is_active ? 'نشط' : 'معطّل'}</span>
                                    </td>
                                    {canUpdate && (
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => onEdit(product)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                    <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => onDelete(product.id)} disabled={deleting === product.id}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                        {deleting === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {page} من {totalPages} ({total} منتج)</p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="btn btn-ghost btn-icon disabled:opacity-30">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn btn-ghost btn-icon disabled:opacity-30">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-32" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-14" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                </tr>
            ))}
        </>
    )
}
