import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Truck, ArrowRight, CheckCircle, XCircle, Printer, PackageCheck, Undo2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getPurchaseOrder, approvePurchaseOrder, deletePurchaseOrder } from '@/lib/services/purchases'
import type { PurchaseOrderWithRefs } from '@/lib/types/purchases'
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/lib/types/purchases'
import { PAYMENT_TERMS_LABELS } from '@/lib/types/customers'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'نقدي', credit: 'آجل', bank_transfer: 'تحويل بنكي',
    instapay: 'إنستاباي', check: 'شيك',
}

export function PurchaseOrderDetailPage() {
    usePageTitle('تفاصيل أمر الشراء')
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile, can } = useAuthStore()

    const [order, setOrder] = useState<PurchaseOrderWithRefs | null>(null)
    const [loading, setLoading] = useState(true)
    const [approving, setApproving] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const loadOrder = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const data = await getPurchaseOrder(id)
            setOrder(data)
        } catch {
            toast.error('خطأ في تحميل أمر الشراء')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadOrder() }, [loadOrder])

    const handleApprove = async () => {
        if (!order) return
        setApproving(true)
        try {
            await approvePurchaseOrder(order.id, profile?.id || '')
            toast.success('تم اعتماد أمر الشراء')
            loadOrder()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الاعتماد')
        } finally {
            setApproving(false)
        }
    }

    const handleDelete = async () => {
        if (!order) return
        setDeleting(true)
        try {
            await deletePurchaseOrder(order.id)
            toast.success('تم حذف أمر الشراء')
            navigate('/purchases')
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(false)
            setShowDelete(false)
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    if (loading) {
        return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
    }

    if (!order) {
        return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>أمر الشراء غير موجود</div>
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/purchases')} className="btn btn-ghost">
                        <ArrowRight className="h-5 w-5" />
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">{order.order_number}</h1>
                        <p className="page-subtitle">{order.supplier?.name}</p>
                    </div>
                    <span className={`badge ${PO_STATUS_COLORS[order.status]} mr-2`}>{PO_STATUS_LABELS[order.status]}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'draft' && can('purchases.orders.approve') && (
                        <button onClick={handleApprove} disabled={approving} className="btn btn-primary">
                            <CheckCircle className="h-4 w-4" /> {approving ? 'جارٍ...' : 'اعتماد'}
                        </button>
                    )}
                    {order.status === 'draft' && can('purchases.orders.delete') && (
                        <button onClick={() => setShowDelete(true)} className="btn btn-secondary" style={{ color: 'var(--color-danger)' }}>
                            <XCircle className="h-4 w-4" /> حذف
                        </button>
                    )}
                    {(order.status === 'approved' || order.status === 'partially_received') && can('purchases.receipts.create') && (
                        <button onClick={() => navigate(`/purchases/receipts/new?po_id=${order.id}`)} className="btn btn-secondary">
                            <PackageCheck className="h-4 w-4" /> إنشاء إذن استلام
                        </button>
                    )}
                    {order.status !== 'draft' && order.status !== 'cancelled' && can('purchases.returns.create') && (
                        <button onClick={() => navigate(`/purchases/returns/new?po_id=${order.id}`)} className="btn btn-secondary">
                            <Undo2 className="h-4 w-4" /> إنشاء مرتجع
                        </button>
                    )}
                    <button onClick={() => window.print()} className="btn btn-ghost">
                        <Printer className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard label="المورد" value={order.supplier?.name || '—'} />
                <InfoCard label="التاريخ" value={new Date(order.order_date).toLocaleDateString('ar-EG')} />
                <InfoCard label="المخزن" value={order.warehouse?.name || '—'} />
                <InfoCard label="الفرع" value={order.branch?.name || '—'} />
                <InfoCard label="طريقة الدفع" value={PAYMENT_LABELS[order.payment_method] || PAYMENT_TERMS_LABELS[order.payment_method] || order.payment_method} />
                {order.approver && <InfoCard label="اعتماد بواسطة" value={order.approver.full_name} />}
                {order.approved_at && <InfoCard label="تاريخ الاعتماد" value={new Date(order.approved_at).toLocaleString('ar-EG')} />}
                {order.notes && <InfoCard label="ملاحظات" value={order.notes} />}
                <InfoCard label="بواسطة" value={order.creator?.full_name || '—'} />
            </div>

            {/* Items Table */}
            <div className="edara-card p-6">
                <h2 className="text-lg font-bold mb-4" >بنود الأمر</h2>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>المنتج</th>
                                <th>SKU</th>
                                <th>الوحدة</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الضريبة</th>
                                <th>الإجمالي</th>
                                <th>المُستلم</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items || []).map((item, idx) => (
                                <tr key={item.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                    <td >{item.product?.name || '—'}</td>
                                    <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{item.product?.sku || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{item.unit?.name || '—'}</td>
                                    <td >{item.quantity}</td>
                                    <td >{formatCurrency(item.unit_price)}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{item.tax_amount > 0 ? formatCurrency(item.tax_amount) : '—'}</td>
                                    <td className="font-semibold" >{formatCurrency(item.total)}</td>
                                    <td>
                                        <span className={item.received_quantity >= item.base_quantity ? 'text-green-600' : item.received_quantity > 0 ? 'text-amber-500' : ''} style={{ color: item.received_quantity >= item.base_quantity ? 'var(--color-success)' : item.received_quantity > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                                            {item.received_quantity} / {item.base_quantity}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end gap-2 text-sm mt-6 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
                    <div className="flex items-center gap-8">
                        <span style={{ color: 'var(--text-secondary)' }}>المجموع الفرعي:</span>
                        <span className="font-semibold w-28 text-left" >{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex items-center gap-8">
                            <span style={{ color: 'var(--color-danger)' }}>الخصم:</span>
                            <span className="font-semibold w-28 text-left" style={{ color: 'var(--color-danger)' }}>-{formatCurrency(order.discount_amount)}</span>
                        </div>
                    )}
                    {order.tax_amount > 0 && (
                        <div className="flex items-center gap-8">
                            <span style={{ color: 'var(--text-secondary)' }}>الضريبة:</span>
                            <span className="font-semibold w-28 text-left" >{formatCurrency(order.tax_amount)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-8 pt-2" >
                        <span className="text-base font-bold" >الإجمالي:</span>
                        <span className="text-lg font-bold w-28 text-left" style={{ color: 'var(--color-primary)' }}>{formatCurrency(order.total_amount)}</span>
                    </div>
                </div>
            </div>

            <ConfirmDialog open={showDelete} title="حذف أمر الشراء" message="هل أنت متأكد من حذف هذا الأمر؟ لا يمكن التراجع."
                loading={deleting} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
        </div>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="edara-card p-4">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-semibold text-sm" >{value}</p>
        </div>
    )
}
