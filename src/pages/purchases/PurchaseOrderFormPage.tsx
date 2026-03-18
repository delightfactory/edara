import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Plus, Trash2, ArrowRight, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { createPurchaseOrder } from '@/lib/services/purchases'
import { getSuppliers } from '@/lib/services/suppliers'
import { getProducts, getUnits, getProductUnits } from '@/lib/services/products'
import { getWarehouses } from '@/lib/services/inventory'
import { getActiveBranches } from '@/lib/services/geography'
import type { PurchaseOrderItemInput, PurchaseOrderInput } from '@/lib/types/purchases'
import type { PaymentTermsType } from '@/lib/types/customers'
import { PAYMENT_TERMS_LABELS } from '@/lib/types/customers'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useClickOutside } from '@/lib/hooks/useClickOutside'
import { toast } from 'sonner'

interface OrderItemRow {
    product_id: string
    product_name: string
    unit_id: string
    quantity: number
    unit_price: number
    tax_amount: number
    conversion_factor: number
    available_units: { id: string; name: string; conversion_factor: number }[]
    isNew?: boolean
}

export function PurchaseOrderFormPage() {
    usePageTitle('أمر شراء جديد')
    const navigate = useNavigate()
    const { profile } = useAuthStore()

    const [suppliers, setSuppliers] = useState<{ id: string; name: string; code: string | null; payment_terms?: string; current_balance?: number }[]>([])
    const [products, setProducts] = useState<{ id: string; name: string; sku: string | null; unit_id: string }[]>([])
    const [units, setUnits] = useState<{ id: string; name: string; symbol: string }[]>([])
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

    const [supplierId, setSupplierId] = useState('')
    const [warehouseId, setWarehouseId] = useState('')
    const [branchId, setBranchId] = useState('')
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]!)
    const [expectedDate, setExpectedDate] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<PaymentTermsType>('cash')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<OrderItemRow[]>([])
    const [saving, setSaving] = useState(false)

    // Supplier search
    const [supplierSearch, setSupplierSearch] = useState('')
    const debouncedSupplierSearch = useDebounce(supplierSearch)
    const [filteredSuppliers, setFilteredSuppliers] = useState<typeof suppliers>([])
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)

    const [productSearch, setProductSearch] = useState('')
    const debouncedSearch = useDebounce(productSearch)
    const [filteredProducts, setFilteredProducts] = useState<typeof products>([])
    const [showDropdown, setShowDropdown] = useState(false)

    // Click outside refs
    const supplierDropdownRef = useClickOutside<HTMLDivElement>(() => setShowSupplierDropdown(false), showSupplierDropdown)
    const productDropdownRef = useClickOutside<HTMLDivElement>(() => setShowDropdown(false), showDropdown)

    useEffect(() => {
        Promise.all([
            getSuppliers({ pageSize: 200 }),
            getProducts({ pageSize: 500 }),
            getUnits(),
            getWarehouses(),
            getActiveBranches(),
        ]).then(([s, p, u, w, b]) => {
            const supList = (s.data || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code, payment_terms: x.payment_terms, current_balance: x.current_balance || 0 }))
            setSuppliers(supList)
            setFilteredSuppliers(supList)
            const prods = (p.data || []).map((x: any) => ({ id: x.id, name: x.name, sku: x.sku, unit_id: x.unit_id || '' }))
            setProducts(prods)
            setFilteredProducts(prods)
            setUnits((u || []).map((x: any) => ({ id: x.id, name: x.name, symbol: x.symbol })))
            const wList = (w || []).map((x: any) => ({ id: x.id, name: x.name }))
            setWarehouses(wList)
            if (wList.length === 1 && wList[0]) setWarehouseId(wList[0].id)
            const bList = b || []
            setBranches(bList)
            if (bList.length === 1 && bList[0]) setBranchId(bList[0].id)
        }).catch(() => toast.error('خطأ في تحميل البيانات'))
    }, [])

    useEffect(() => {
        if (!debouncedSearch) setFilteredProducts(products)
        else setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()))))
    }, [debouncedSearch, products])

    // Filter suppliers
    useEffect(() => {
        if (!debouncedSupplierSearch) setFilteredSuppliers(suppliers)
        else setFilteredSuppliers(suppliers.filter(s => s.name.toLowerCase().includes(debouncedSupplierSearch.toLowerCase()) || (s.code && s.code.toLowerCase().includes(debouncedSupplierSearch.toLowerCase()))))
    }, [debouncedSupplierSearch, suppliers])

    const selectSupplier = (id: string) => {
        setSupplierId(id)
        setShowSupplierDropdown(false)
        const sup = suppliers.find(s => s.id === id)
        if (sup) {
            setSupplierSearch(sup.name)
            // Auto-set payment terms from supplier
            if (sup.payment_terms) setPaymentMethod(sup.payment_terms as PaymentTermsType)
        }
    }

    const selectedSupplier = suppliers.find(s => s.id === supplierId)

    const addProduct = async (product: typeof products[0]) => {
        setShowDropdown(false)
        setProductSearch('')

        // Duplicate check
        const existingIdx = items.findIndex(i => i.product_id === product.id)
        if (existingIdx >= 0) {
            updateItem(existingIdx, 'quantity', (items[existingIdx]?.quantity || 0) + 1)
            toast.info(`تم زيادة كمية "${product.name}"`)
            return
        }

        // Fetch product-specific units
        let prodUnits: { id: string; name: string; conversion_factor: number }[] = []
        try {
            const baseUnit = units.find(u => u.id === product.unit_id)
            if (product.unit_id && baseUnit) {
                prodUnits = [{ id: product.unit_id, name: baseUnit.name, conversion_factor: 1 }]
            }
            const altUnits = await getProductUnits(product.id)
            altUnits.forEach(pu => {
                if (pu.unit?.id && pu.unit.id !== product.unit_id) {
                    prodUnits.push({ id: pu.unit.id, name: pu.unit.name, conversion_factor: pu.conversion_factor })
                }
            })
        } catch { /* use base only */ }

        const selectedUnitId = product.unit_id || (prodUnits.length > 0 ? prodUnits[0]!.id : '')
        if (!selectedUnitId) {
            toast.error(`لا يمكن إضافة "${product.name}" — لا توجد وحدة محددة`)
            return
        }

        setItems(prev => [...prev, { product_id: product.id, product_name: product.name, unit_id: selectedUnitId, quantity: 1, unit_price: 0, tax_amount: 0, conversion_factor: 1, available_units: prodUnits, isNew: true }])
        setTimeout(() => setItems(prev => prev.map(i => ({ ...i, isNew: false }))), 1500)
    }

    const updateItem = (idx: number, field: keyof OrderItemRow, value: number | string) => {
        setItems(prev => { const u = [...prev]; (u[idx] as any)[field] = value; return u })
    }

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const totalTax = items.reduce((s, i) => s + i.tax_amount, 0)
    const grandTotal = subtotal + totalTax
    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleSubmit = async () => {
        if (!supplierId) { toast.error('يرجى اختيار المورد'); return }
        if (!warehouseId) { toast.error('يرجى اختيار المخزن'); return }
        if (items.length === 0) { toast.error('يرجى إضافة منتج واحد على الأقل'); return }

        setSaving(true)
        const userId: string = profile?.id || ''
        try {
            const orderItems: PurchaseOrderItemInput[] = items.map(i => ({
                product_id: i.product_id, unit_id: i.unit_id, quantity: i.quantity, unit_price: i.unit_price,
                tax_amount: i.tax_amount, total: i.quantity * i.unit_price + i.tax_amount,
                conversion_factor: i.conversion_factor, base_quantity: i.quantity * i.conversion_factor,
            }))
            const orderInput: PurchaseOrderInput = {
                supplier_id: supplierId, warehouse_id: warehouseId, branch_id: branchId || null,
                order_date: orderDate, payment_method: paymentMethod, notes: notes || null, items: orderItems,
            }
            const order = await createPurchaseOrder(orderInput, userId)
            toast.success(`تم إنشاء أمر الشراء ${order.order_number}`)
            navigate('/purchases')
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل الإنشاء')
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/purchases')} className="btn btn-ghost"><ArrowRight className="h-5 w-5" /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">أمر شراء جديد</h1>
                    <p className="page-subtitle">إنشاء طلب شراء من المورد</p>
                </div>
            </div>

            <div className="edara-card p-6">
                <h2 className="text-lg font-bold mb-4" >بيانات الطلب</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="relative" ref={supplierDropdownRef}>
                        <label className="form-label">المورد *</label>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <input type="text" value={supplierSearch} placeholder="ابحث عن مورد..."
                                onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); if (!e.target.value) setSupplierId('') }}
                                onFocus={() => setShowSupplierDropdown(true)}
                                className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                        </div>
                        {showSupplierDropdown && filteredSuppliers.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 w-full max-h-48 overflow-y-auto edara-card shadow-lg" style={{ border: '1px solid var(--border-primary)' }}>
                                {filteredSuppliers.slice(0, 20).map(s => (
                                    <div key={s.id} onClick={() => selectSupplier(s.id)}
                                        className="px-3 py-2 cursor-pointer hover:opacity-80 text-sm"
                                        style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>
                                        {s.name} {s.code && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({s.code})</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedSupplier && (
                            <div className="mt-2 p-2.5 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>الرصيد:</span> <span className="font-semibold" style={{ color: (selectedSupplier.current_balance || 0) > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{formatCurrency(selectedSupplier.current_balance || 0)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>شروط الدفع:</span> <span style={{ color: 'var(--text-secondary)' }}>{PAYMENT_TERMS_LABELS[(selectedSupplier.payment_terms || 'cash') as PaymentTermsType]}</span></div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="form-label">المخزن *</label>
                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="form-input">
                            <option value="">— اختر —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">الفرع</label>
                        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="form-input">
                            <option value="">— بدون —</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">تاريخ الطلب *</label>
                        <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">تاريخ التوريد المتوقع</label>
                        <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">طريقة الدفع</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentTermsType)} className="form-input">
                            {(Object.entries(PAYMENT_TERMS_LABELS) as [PaymentTermsType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                        <label className="form-label">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="form-input" rows={2} />
                    </div>
                </div>
            </div>

            <div className="edara-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" >بنود الطلب</h2>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{items.length} صنف</span>
                </div>
                <div className="relative mb-4" ref={productDropdownRef}>
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="ابحث عن منتج..." value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)} className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    {showDropdown && productSearch && filteredProducts.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 w-full max-h-48 overflow-y-auto edara-card shadow-lg" style={{ border: '1px solid var(--border-primary)' }}>
                            {filteredProducts.slice(0, 15).map(p => (
                                <div key={p.id} onClick={() => addProduct(p)} className="px-3 py-2 cursor-pointer hover:opacity-80 text-sm flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <Plus className="h-3 w-3 text-primary-500" /> {p.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {items.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>الوحدة</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '80px' }}>الكمية</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>السعر</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>الضريبة</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>الإجمالي</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} style={{ transition: 'background 0.5s', background: item.isNew ? 'var(--color-primary-light, rgba(59,130,246,0.08))' : undefined }}>
                                        <td >{item.product_name}</td>
                                        <td><select value={item.unit_id} onChange={e => {
                                            const selUnit = item.available_units.find(u => u.id === e.target.value)
                                            updateItem(idx, 'unit_id', e.target.value)
                                            if (selUnit) updateItem(idx, 'conversion_factor', selUnit.conversion_factor)
                                        }} className="form-input text-xs py-1">
                                            {(item.available_units.length > 0 ? item.available_units : units).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select></td>
                                        <td><input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="form-input text-xs py-1 text-center" /></td>
                                        <td><input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="form-input text-xs py-1 text-center" /></td>
                                        <td><input type="number" min="0" step="0.01" value={item.tax_amount} onChange={e => updateItem(idx, 'tax_amount', Number(e.target.value))} className="form-input text-xs py-1 text-center" /></td>
                                        <td className="font-semibold" >{formatCurrency(item.quantity * item.unit_price + item.tax_amount)}</td>
                                        <td><button onClick={() => removeItem(idx)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}><Trash2 className="h-3.5 w-3.5" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                            {items.length > 0 && (
                                <tfoot>
                                    <tr >
                                        <td className="font-bold text-sm" >الإجمالي ({items.length} صنف)</td>
                                        <td></td>
                                        <td className="font-bold text-sm text-center" >{items.reduce((s, i) => s + i.quantity, 0)}</td>
                                        <td></td>
                                        <td className="font-bold text-sm" >{formatCurrency(totalTax)}</td>
                                        <td className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>{formatCurrency(grandTotal)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
                {items.length === 0 && (<div className="data-table-empty"><Truck className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>ابحث عن منتج وأضفه</p></div>)}
            </div>

            <div className="edara-card p-6">
                <div className="flex flex-col items-end gap-2 text-sm">
                    <div className="flex items-center gap-8"><span style={{ color: 'var(--text-secondary)' }}>المجموع الفرعي:</span><span className="font-semibold" >{formatCurrency(subtotal)}</span></div>
                    <div className="flex items-center gap-8"><span style={{ color: 'var(--text-secondary)' }}>الضريبة:</span><span className="font-semibold" >{formatCurrency(totalTax)}</span></div>
                    <div className="flex items-center gap-8 pt-2" >
                        <span className="text-base font-bold" >الإجمالي:</span>
                        <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{formatCurrency(grandTotal)} ج.م</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={() => navigate('/purchases')} className="btn btn-secondary">إلغاء</button>
                <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">{saving ? 'جارٍ الحفظ...' : 'إنشاء أمر الشراء'}</button>
            </div>
        </div>
    )
}
