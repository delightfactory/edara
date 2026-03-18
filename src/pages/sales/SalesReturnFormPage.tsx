import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Undo2, ArrowRight, Package, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getSalesOrder, createSalesReturn } from '@/lib/services/sales'
import { getSalesOrders } from '@/lib/services/sales'
import type { SalesOrderWithRefs, SalesReturnItemInput, SalesReturnInput } from '@/lib/types/sales'

import { PAYMENT_TERMS_LABELS } from '@/lib/types/customers'
import type { PaymentTermsType } from '@/lib/types/customers'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

interface ReturnItemRow {
    order_item_id: string | null
    product_id: string
    product_name: string
    unit_id: string
    unit_name: string
    max_quantity: number
    quantity: number
    unit_price: number
    conversion_factor: number
    selected: boolean
}

export function SalesReturnFormPage() {
    usePageTitle('إنشاء مرتجع مبيعات')
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { profile } = useAuthStore()

    const [orderId, setOrderId] = useState(searchParams.get('order_id') || '')
    const [orders, setOrders] = useState<SalesOrderWithRefs[]>([])
    const [order, setOrder] = useState<SalesOrderWithRefs | null>(null)
    const [items, setItems] = useState<ReturnItemRow[]>([])
    const [reason, setReason] = useState('')
    const [notes, setNotes] = useState('')
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]!)
    const [saving, setSaving] = useState(false)
    const [loadingOrder, setLoadingOrder] = useState(false)

    // Load confirmed orders for dropdown
    useEffect(() => {
        getSalesOrders({ status: 'confirmed', pageSize: 100 }).then(r => setOrders(r.data)).catch(() => {})
    }, [])

    // Load order items when order is selected
    const loadOrderItems = useCallback(async (id: string) => {
        if (!id) { setOrder(null); setItems([]); return }
        setLoadingOrder(true)
        try {
            const data = await getSalesOrder(id)
            setOrder(data)
            if (data?.items) {
                setItems(data.items.map(item => ({
                    order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.name ?? '—',
                    unit_id: item.unit_id,
                    unit_name: item.unit?.name ?? '—',
                    max_quantity: item.quantity,
                    quantity: item.quantity, // default to full quantity
                    unit_price: item.unit_price,
                    conversion_factor: item.conversion_factor,
                    selected: true, // default all selected
                })))
            }
        } catch {
            toast.error('خطأ في تحميل الطلب')
        } finally {
            setLoadingOrder(false)
        }
    }, [])

    useEffect(() => { if (orderId) loadOrderItems(orderId) }, [orderId, loadOrderItems])

    const toggleItem = (idx: number) => {
        setItems(prev => {
            const u = [...prev]
            const item = u[idx]
            if (!item) return u
            item.selected = !item.selected
            if (item.selected && item.quantity === 0) item.quantity = item.max_quantity
            return u
        })
    }

    const updateQuantity = (idx: number, qty: number) => {
        setItems(prev => {
            const u = [...prev]
            const item = u[idx]
            if (!item) return u
            item.quantity = Math.max(0, Math.min(qty, item.max_quantity))
            if (item.quantity > 0 && !item.selected) item.selected = true
            if (item.quantity === 0) item.selected = false
            return u
        })
    }

    const selectAll = () => setItems(prev => prev.map(i => ({ ...i, selected: true, quantity: i.quantity || i.max_quantity })))
    const deselectAll = () => setItems(prev => prev.map(i => ({ ...i, selected: false, quantity: 0 })))

    const selectedItems = items.filter(i => i.selected && i.quantity > 0)
    const totalAmount = selectedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleSubmit = async () => {
        if (!orderId || !order) { toast.error('يرجى اختيار أمر البيع'); return }
        if (selectedItems.length === 0) { toast.error('يرجى اختيار بند واحد على الأقل'); return }

        setSaving(true)
        const userId: string = profile?.id || ''
        try {
            const returnItems: SalesReturnItemInput[] = selectedItems.map(i => ({
                order_item_id: i.order_item_id,
                product_id: i.product_id,
                unit_id: i.unit_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total: i.quantity * i.unit_price,
                conversion_factor: i.conversion_factor,
                base_quantity: i.quantity * i.conversion_factor,
            }))

            const returnInput: SalesReturnInput = {
                order_id: orderId,
                customer_id: order!.customer_id,
                warehouse_id: order!.warehouse_id,
                branch_id: order!.branch_id ?? null,
                return_date: returnDate,
                total_amount: totalAmount,
                reason: reason || null,
                notes: notes || null,
                items: returnItems,
            }
            await createSalesReturn(returnInput, userId)

            toast.success('تم إنشاء مرتجع المبيعات')
            navigate('/sales/returns')
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الإنشاء')
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/sales/returns')} className="btn btn-ghost"><ArrowRight className="h-5 w-5" /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <Undo2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">مرتجع مبيعات جديد</h1>
                    <p className="page-subtitle">اختر الطلب الأصلي والبنود المراد إرجاعها</p>
                </div>
            </div>

            {/* Order Selection & Details */}
            <div className="edara-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="form-label">أمر البيع *</label>
                        <select value={orderId} onChange={e => setOrderId(e.target.value)} className="form-input">
                            <option value="">— اختر أمر بيع —</option>
                            {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer?.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">تاريخ المرتجع *</label>
                        <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">السبب</label>
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="form-input" placeholder="سبب المرتجع..." />
                    </div>
                    <div className="md:col-span-3">
                        <label className="form-label">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="form-input" rows={2} />
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loadingOrder && (
                <div className="edara-card p-8 text-center">
                    <div className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        جارٍ تحميل بنود الطلب...
                    </div>
                </div>
            )}

            {/* Order Summary */}
            {order && (
                <div className="edara-card p-4">
                    <h3 className="text-sm font-bold mb-2">ملخص الطلب الأصلي</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><span style={{ color: 'var(--text-muted)' }}>العميل: </span><strong>{order.customer?.name}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>الإجمالي: </span><strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(order.total_amount)}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>التاريخ: </span><strong style={{ color: 'var(--text-secondary)' }}>{new Date(order.order_date).toLocaleDateString('ar-EG')}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>الدفع: </span><strong style={{ color: 'var(--text-secondary)' }}>{PAYMENT_TERMS_LABELS[(order.payment_method || 'cash') as PaymentTermsType]}</strong></div>
                    </div>
                </div>
            )}

            {/* Items Selection */}
            {order && items.length > 0 && (
                <div className="edara-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">اختر البنود المراد إرجاعها</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={selectAll} className="btn btn-ghost text-xs" style={{ color: 'var(--color-primary-600)' }}>تحديد الكل</button>
                            <button onClick={deselectAll} className="btn btn-ghost text-xs" style={{ color: 'var(--text-muted)' }}>إلغاء التحديد</button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => toggleItem(idx)}
                                className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                                style={{
                                    borderColor: item.selected ? 'var(--item-selected-border)' : 'var(--card-border)',
                                    backgroundColor: item.selected ? 'var(--item-selected-bg)' : 'var(--card-bg)',
                                }}
                            >
                                {/* Checkbox */}
                                <div
                                    className="flex items-center justify-center h-6 w-6 rounded-md border-2 flex-shrink-0 transition-all"
                                    style={{
                                        borderColor: item.selected ? 'var(--color-primary-500)' : 'var(--border-primary)',
                                        backgroundColor: item.selected ? 'var(--color-primary-500)' : 'transparent',
                                    }}
                                >
                                    {item.selected && <Check className="h-4 w-4 text-white" />}
                                </div>

                                {/* Product Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: 'var(--color-surface-100)' }}>
                                        <Package className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate">{item.product_name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {item.unit_name} · الكمية الأصلية: {item.max_quantity} · السعر: {formatCurrency(item.unit_price)}
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity Input */}
                                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>الكمية:</label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                                            disabled={!item.selected || item.quantity <= 0}
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                                            style={{ backgroundColor: 'var(--color-surface-100)', color: 'var(--text-primary)' }}
                                        >−</button>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.max_quantity}
                                            step="1"
                                            value={item.quantity}
                                            onChange={e => updateQuantity(idx, Number(e.target.value))}
                                            disabled={!item.selected}
                                            className="form-input text-center font-semibold"
                                            style={{ width: '70px', padding: '0.375rem 0.25rem' }}
                                        />
                                        <button
                                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                                            disabled={!item.selected || item.quantity >= item.max_quantity}
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                                            style={{ backgroundColor: 'var(--color-surface-100)', color: 'var(--text-primary)' }}
                                        >+</button>
                                    </div>
                                </div>

                                {/* Item Total */}
                                <div className="text-left flex-shrink-0" style={{ minWidth: '80px' }}>
                                    <p className="font-bold text-sm" style={{ color: item.selected ? 'var(--color-primary-600)' : 'var(--text-muted)' }}>
                                        {item.selected && item.quantity > 0 ? formatCurrency(item.quantity * item.unit_price) : '—'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mt-6 pt-4" style={{ borderTop: '2px solid var(--divider-color)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{selectedItems.length} من {items.length} بند محدد</span>
                        <div className="text-xl font-bold" style={{ color: 'var(--color-primary-600)' }}>
                            إجمالي المرتجع: {formatCurrency(totalAmount)} ج.م
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state when order has no items */}
            {order && items.length === 0 && !loadingOrder && (
                <div className="edara-card p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-muted)' }}>لا توجد بنود لهذا الطلب</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
                <button onClick={() => navigate('/sales/returns')} className="btn btn-secondary">إلغاء</button>
                <button onClick={handleSubmit} disabled={saving || selectedItems.length === 0} className="btn btn-primary">
                    {saving ? 'جارٍ الحفظ...' : `إنشاء المرتجع (${selectedItems.length} بند)`}
                </button>
            </div>
        </div>
    )
}
