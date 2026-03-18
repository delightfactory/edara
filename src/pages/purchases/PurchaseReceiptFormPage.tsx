import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageCheck, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getPurchaseOrders, getPurchaseOrder, createPurchaseReceipt } from '@/lib/services/purchases'
import { getWarehouses } from '@/lib/services/inventory'
import type { PurchaseOrderWithRefs, PurchaseReceiptItemInput } from '@/lib/types/purchases'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

interface ReceiptItemRow {
    order_item_id: string
    product_id: string
    product_name: string
    unit_id: string
    unit_name: string
    ordered_quantity: number
    received_quantity: number
    accepted_quantity: number
    rejected_quantity: number
    rejection_reason: string
    batch_number: string
    expiry_date: string
    conversion_factor: number
}

export function PurchaseReceiptFormPage() {
    usePageTitle('إذن استلام جديد')
    const navigate = useNavigate()
    const { profile } = useAuthStore()

    const [orders, setOrders] = useState<PurchaseOrderWithRefs[]>([])
    const [orderId, setOrderId] = useState('')
    const [order, setOrder] = useState<PurchaseOrderWithRefs | null>(null)
    const [warehouseId, setWarehouseId] = useState('')
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [items, setItems] = useState<ReceiptItemRow[]>([])
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [loadingOrder, setLoadingOrder] = useState(false)

    useEffect(() => {
        Promise.all([
            getPurchaseOrders({ pageSize: 200 }),
            getWarehouses(),
        ]).then(([o, w]) => {
            setOrders(o.data.filter(x => x.status === 'approved' || x.status === 'partially_received'))
            setWarehouses((w || []).map((x: any) => ({ id: x.id, name: x.name })))
        }).catch(() => {})
    }, [])

    const loadOrderItems = useCallback(async (id: string) => {
        if (!id) { setOrder(null); setItems([]); return }
        setLoadingOrder(true)
        try {
            const data = await getPurchaseOrder(id)
            setOrder(data)
            if (data?.warehouse_id) setWarehouseId(data.warehouse_id)
            if (data?.items) {
                setItems(data.items.map(item => ({
                    order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.name ?? '—',
                    unit_id: item.unit_id,
                    unit_name: item.unit?.name ?? '—',
                    ordered_quantity: item.quantity,
                    received_quantity: item.quantity,
                    accepted_quantity: item.quantity,
                    rejected_quantity: 0,
                    rejection_reason: '',
                    batch_number: '',
                    expiry_date: '',
                    conversion_factor: item.conversion_factor,
                })))
            }
        } catch { toast.error('خطأ في تحميل الطلب') }
        finally { setLoadingOrder(false) }
    }, [])

    useEffect(() => { if (orderId) loadOrderItems(orderId) }, [orderId, loadOrderItems])

    const updateItem = (idx: number, field: keyof ReceiptItemRow, value: string | number) => {
        setItems(prev => {
            const u = [...prev]
            const item = u[idx]
            if (!item) return u
            ;(item as any)[field] = value
            // Auto-calc: received = accepted + rejected
            if (field === 'accepted_quantity' || field === 'rejected_quantity') {
                item.received_quantity = Number(item.accepted_quantity) + Number(item.rejected_quantity)
            }
            if (field === 'received_quantity') {
                item.accepted_quantity = Number(value) - item.rejected_quantity
            }
            return u
        })
    }



    const handleSubmit = async () => {
        if (!orderId) { toast.error('يرجى اختيار أمر الشراء'); return }
        if (!warehouseId) { toast.error('يرجى اختيار المخزن'); return }

        setSaving(true)
        try {
            const receiptItems: PurchaseReceiptItemInput[] = items.map(i => ({
                order_item_id: i.order_item_id,
                product_id: i.product_id,
                unit_id: i.unit_id,
                ordered_quantity: i.ordered_quantity,
                received_quantity: i.received_quantity,
                accepted_quantity: i.accepted_quantity,
                rejected_quantity: i.rejected_quantity,
                rejection_reason: i.rejection_reason || null,
                batch_number: i.batch_number || null,
                expiry_date: i.expiry_date || null,
                conversion_factor: i.conversion_factor,
                base_quantity: i.accepted_quantity * i.conversion_factor,
            }))

            await createPurchaseReceipt(orderId, warehouseId, receiptItems, profile?.id || '', notes || undefined)
            toast.success('تم إنشاء إذن الاستلام')
            navigate('/purchases/receipts')
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الإنشاء')
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/purchases/receipts')} className="btn btn-ghost"><ArrowRight className="h-5 w-5" /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <PackageCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div><h1 className="page-title">إذن استلام جديد</h1><p className="page-subtitle">استلام بضاعة مقابل أمر شراء</p></div>
            </div>

            <div className="edara-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="form-label">أمر الشراء *</label>
                        <select value={orderId} onChange={e => setOrderId(e.target.value)} className="form-input">
                            <option value="">— اختر —</option>
                            {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.supplier?.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">المخزن *</label>
                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="form-input">
                            <option value="">— اختر —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="form-input" rows={2} />
                    </div>
                </div>
            </div>

            {loadingOrder && <div className="data-table-empty">جارٍ التحميل...</div>}

            {order && items.length > 0 && (
                <div className="edara-card p-6">
                    <h2 className="text-lg font-bold mb-4" >بنود الاستلام — مقارنة المطلوب vs الفعلي</h2>
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>الوحدة</th>
                                    <th>المطلوب</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '80px' }}>المستلم</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '80px' }}>المقبول</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '80px' }}>المرفوض</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '140px' }}>سبب الرفض</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>رقم الدفعة</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '120px' }}>تاريخ الانتهاء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td >{item.product_name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{item.unit_name}</td>
                                        <td className="font-semibold" >{item.ordered_quantity}</td>
                                        <td><input type="number" min="0" value={item.received_quantity} onChange={e => updateItem(idx, 'received_quantity', Number(e.target.value))} className="form-input text-xs py-1 text-center" /></td>
                                        <td><input type="number" min="0" value={item.accepted_quantity} onChange={e => updateItem(idx, 'accepted_quantity', Number(e.target.value))} className="form-input text-xs py-1 text-center" /></td>
                                        <td><input type="number" min="0" value={item.rejected_quantity} onChange={e => updateItem(idx, 'rejected_quantity', Number(e.target.value))} className="form-input text-xs py-1 text-center" /></td>
                                        <td><input type="text" value={item.rejection_reason} onChange={e => updateItem(idx, 'rejection_reason', e.target.value)} className="form-input text-xs py-1" placeholder={item.rejected_quantity > 0 ? 'السبب...' : ''} /></td>
                                        <td><input type="text" value={item.batch_number} onChange={e => updateItem(idx, 'batch_number', e.target.value)} className="form-input text-xs py-1" /></td>
                                        <td><input type="date" value={item.expiry_date} onChange={e => updateItem(idx, 'expiry_date', e.target.value)} className="form-input text-xs py-1" /></td>
                                    </tr>
                                ))}
                            </tbody>
                            {items.length > 0 && (
                                <tfoot>
                                    <tr >
                                        <td colSpan={2} className="font-bold text-sm" >الإجمالي</td>
                                        <td className="font-bold text-sm" >{items.reduce((s, i) => s + i.ordered_quantity, 0)}</td>
                                        <td className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>{items.reduce((s, i) => s + i.received_quantity, 0)}</td>
                                        <td className="font-bold text-sm" style={{ color: 'var(--color-success)' }}>{items.reduce((s, i) => s + i.accepted_quantity, 0)}</td>
                                        <td className="font-bold text-sm" style={{ color: 'var(--color-danger)' }}>{items.reduce((s, i) => s + i.rejected_quantity, 0)}</td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3">
                <button onClick={() => navigate('/purchases/receipts')} className="btn btn-secondary">إلغاء</button>
                <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'إنشاء إذن الاستلام'}</button>
            </div>
        </div>
    )
}
