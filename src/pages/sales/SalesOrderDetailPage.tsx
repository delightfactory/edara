import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, ArrowRight, CheckCircle, XCircle, Undo2, Printer, Calendar, CreditCard, Truck, User, Package, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getSalesOrder, confirmSalesOrder, cancelSalesOrder } from '@/lib/services/sales'
import type { SalesOrderWithRefs } from '@/lib/types/sales'
import { ORDER_STATUS_LABELS } from '@/lib/types/sales'
import { PAYMENT_TERMS_LABELS, DELIVERY_METHOD_LABELS } from '@/lib/types/customers'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

// Status gradient backgrounds
const STATUS_GRADIENTS: Record<string, string> = {
    draft: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    confirmed: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    cancelled: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    partial: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    completed: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
}

export function SalesOrderDetailPage() {
    usePageTitle('تفاصيل أمر البيع')
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile, can } = useAuthStore()

    const [order, setOrder] = useState<SalesOrderWithRefs | null>(null)
    const [loading, setLoading] = useState(true)
    const [confirming, setConfirming] = useState(false)
    const [showCancel, setShowCancel] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelling, setCancelling] = useState(false)

    const loadOrder = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const data = await getSalesOrder(id)
            setOrder(data)
        } catch {
            toast.error('خطأ في تحميل الطلب')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadOrder() }, [loadOrder])

    const handleConfirm = async () => {
        if (!order) return
        setConfirming(true)
        try {
            await confirmSalesOrder(order.id, profile?.id || '')
            toast.success('تم تأكيد أمر البيع')
            loadOrder()
        } catch (err: unknown) {
            toast.error((err as any)?.message || 'فشل التأكيد')
        } finally {
            setConfirming(false)
        }
    }

    const handleCancel = async () => {
        if (!order) return
        setCancelling(true)
        try {
            await cancelSalesOrder(order.id, cancelReason || 'بدون سبب', profile?.id || '')
            toast.success('تم إلغاء أمر البيع')
            setShowCancel(false)
            loadOrder()
        } catch (err: unknown) {
            toast.error((err as any)?.message || 'فشل الإلغاء')
        } finally {
            setCancelling(false)
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
    const formatDateTime = (d: string) => new Date(d).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    // ── Loading state ──────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-3"
                    style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="edara-empty flex flex-col items-center gap-3 py-20">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                    <ShoppingCart className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-medium" style={{ color: 'var(--text-muted)' }}>الطلب غير موجود</p>
                <button onClick={() => navigate('/sales')} className="btn btn-secondary btn-sm mt-2">العودة للقائمة</button>
            </div>
        )
    }

    return (
        <div className="space-y-5 animate-[fade-in_0.4s_ease-out]">
            {/* ═══════════════════════════════════════════════════
                Header Card — Order number, status, customer, total
                ═══════════════════════════════════════════════════ */}
            <div className="edara-card overflow-hidden">
                {/* Status banner */}
                <div className="px-5 py-4 text-white" style={{ background: STATUS_GRADIENTS[order.status] || STATUS_GRADIENTS.draft }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/sales')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors">
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold">{order.order_number}</h1>
                                <p className="text-sm text-white/80">{order.customer?.name || '—'}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/20 backdrop-blur-sm">
                                {ORDER_STATUS_LABELS[order.status]}
                            </span>
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-white/60">الإجمالي</p>
                            <p className="text-xl font-bold">{formatCurrency(order.total_amount)} <span className="text-sm text-white/70">ج.م</span></p>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid var(--border-primary)' }}>
                    {order.status === 'draft' && can('sales.orders.confirm') && (
                        <button onClick={handleConfirm} disabled={confirming} className="btn btn-primary btn-sm">
                            <CheckCircle className="h-4 w-4" /> {confirming ? 'جارٍ...' : 'تأكيد الطلب'}
                        </button>
                    )}
                    {(order.status === 'draft' || order.status === 'confirmed') && can('sales.orders.cancel') && (
                        <button onClick={() => setShowCancel(true)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger)' }}>
                            <XCircle className="h-4 w-4" /> {order.status === 'confirmed' ? 'إلغاء (عكس)' : 'إلغاء'}
                        </button>
                    )}
                    {order.status === 'confirmed' && can('sales.returns.create') && (
                        <button onClick={() => navigate(`/sales/returns/new?order_id=${order.id}`)} className="btn btn-secondary btn-sm">
                            <Undo2 className="h-4 w-4" /> إنشاء مرتجع
                        </button>
                    )}
                    <button onClick={() => window.print()} className="btn btn-ghost btn-sm mr-auto">
                        <Printer className="h-4 w-4" /> طباعة
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                معلومات الطلب — بطاقتين side-by-side
                ═══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* بطاقة الدفع والتوصيل */}
                <div className="edara-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-4 w-4 text-primary-500" />
                        <h3 className="text-sm font-bold" >الدفع والتوصيل</h3>
                    </div>
                    <div className="space-y-3">
                        <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="التاريخ" value={formatDate(order.order_date)} />
                        <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="طريقة الدفع" value={PAYMENT_TERMS_LABELS[order.payment_method] || order.payment_method} />
                        <InfoRow icon={<Truck className="h-3.5 w-3.5" />} label="التوصيل" value={DELIVERY_METHOD_LABELS[order.delivery_method] || order.delivery_method} />
                        {order.shipping_company?.name && (
                            <InfoRow icon={<Truck className="h-3.5 w-3.5" />} label="شركة الشحن" value={order.shipping_company.name} />
                        )}
                        {order.warehouse?.name && (
                            <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="المخزن" value={order.warehouse.name} />
                        )}
                        {order.branch?.name && (
                            <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="الفرع" value={order.branch.name} />
                        )}
                        {order.vault?.name && (
                            <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="الخزنة" value={order.vault.name} />
                        )}
                        {order.custody?.employee?.profile?.full_name && (
                            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="العهدة" value={order.custody.employee.profile.full_name} />
                        )}
                        {order.sales_rep?.employee?.profile?.full_name && (
                            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="المندوب" value={order.sales_rep.employee.profile.full_name} />
                        )}
                        {order.notes && (
                            <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="ملاحظات" value={order.notes} />
                        )}
                    </div>
                </div>

                {/* بطاقة التتبع */}
                <div className="edara-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-4 w-4 text-primary-500" />
                        <h3 className="text-sm font-bold" >التتبع</h3>
                    </div>
                    <div className="space-y-3">
                        <InfoRow icon={<User className="h-3.5 w-3.5" />} label="أنشأ بواسطة" value={order.creator?.full_name || '—'} />
                        <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ الإنشاء" value={formatDateTime(order.created_at)} />

                        {order.confirmer && (
                            <>
                                <div className="edara-divider" />
                                <InfoRow icon={<CheckCircle className="h-3.5 w-3.5" />} label="أكد بواسطة" value={order.confirmer.full_name} highlight="success" />
                                {order.confirmed_at && (
                                    <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ التأكيد" value={formatDateTime(order.confirmed_at)} />
                                )}
                            </>
                        )}

                        {order.canceller && (
                            <>
                                <div className="edara-divider" />
                                <InfoRow icon={<XCircle className="h-3.5 w-3.5" />} label="ألغى بواسطة" value={order.canceller.full_name} highlight="danger" />
                                {order.cancelled_at && (
                                    <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ الإلغاء" value={formatDateTime(order.cancelled_at)} />
                                )}
                                {order.cancellation_reason && (
                                    <InfoRow icon={<XCircle className="h-3.5 w-3.5" />} label="سبب الإلغاء" value={order.cancellation_reason} highlight="danger" />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                بنود الطلب
                ═══════════════════════════════════════════════════ */}
            <div className="edara-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary-500" />
                        <h3 className="text-sm font-bold" >بنود الطلب</h3>
                    </div>
                    <span className="badge badge-primary">{(order.items || []).length} صنف</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table text-sm" style={{ minWidth: '600px' }}>
                        <thead>
                            <tr>
                                <th style={{ color: 'var(--text-secondary)', width: '36px' }}>#</th>
                                <th>المنتج</th>
                                <th>الوحدة</th>
                                <th style={{ color: 'var(--text-secondary)', width: '70px' }}>الكمية</th>
                                <th style={{ color: 'var(--text-secondary)', width: '90px' }}>السعر</th>
                                <th style={{ color: 'var(--text-secondary)', width: '90px' }}>الخصم</th>
                                <th style={{ color: 'var(--text-secondary)', width: '90px' }}>الضريبة</th>
                                <th style={{ color: 'var(--text-secondary)', width: '100px' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items || []).map((item, idx) => (
                                <tr key={item.id} style={{ animation: `fade-in 0.3s ease-out ${idx * 40}ms backwards` }}>
                                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                    <td>
                                        <span className="font-medium" >{item.product?.name || '—'}</span>
                                        {item.product?.sku && (
                                            <span className="block text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{item.product.sku}</span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{item.unit?.name || '—'}</td>
                                    <td className="font-medium" >{item.quantity}</td>
                                    <td >{formatCurrency(item.unit_price)}</td>
                                    <td style={{ color: item.discount_amount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                                        {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '—'}
                                    </td>
                                    <td style={{ color: item.tax_amount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                        {item.tax_amount > 0 ? formatCurrency(item.tax_amount) : '—'}
                                    </td>
                                    <td className="font-bold" >{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end gap-1.5 text-sm mt-5 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
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
                    <div className="flex items-center gap-8 pt-2 mt-1" >
                        <span className="text-base font-bold" >الإجمالي:</span>
                        <span className="text-lg font-bold w-28 text-left" style={{ color: 'var(--color-primary)' }}>{formatCurrency(order.total_amount)}</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                Cancel Dialog
                ═══════════════════════════════════════════════════ */}
            {showCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="edara-overlay" onClick={() => setShowCancel(false)} />
                    <div className="edara-card w-full max-w-md relative z-10 overflow-hidden" style={{ animation: 'scale-in 0.2s ease-out' }}>
                        {/* Modal header */}
                        <div className="bg-gradient-to-l from-red-600 to-red-700 px-6 py-4 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                    <XCircle className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold">إلغاء أمر البيع</h2>
                                    <p className="text-xs text-red-200 mt-0.5">{order.order_number}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="form-label">سبب الإلغاء</label>
                                <textarea
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    className="form-input"
                                    rows={3}
                                    placeholder="أدخل سبب الإلغاء..."
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowCancel(false)} className="btn btn-secondary">تراجع</button>
                                <button onClick={handleCancel} disabled={cancelling} className="btn btn-danger">
                                    {cancelling ? 'جارٍ...' : 'تأكيد الإلغاء'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── InfoRow Component ──────────────────────────────────────
function InfoRow({ icon, label, value, highlight }: {
    icon: React.ReactNode
    label: string
    value: string
    highlight?: 'success' | 'danger'
}) {
    const valueColor = highlight === 'success' ? 'var(--color-success)' : highlight === 'danger' ? 'var(--color-danger)' : 'var(--text-primary)'
    return (
        <div className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {icon}
            </div>
            <div className="flex-1 flex items-start justify-between gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="text-sm font-medium text-left" style={{ color: valueColor }}>{value}</span>
            </div>
        </div>
    )
}
