import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Trash2, ArrowRight, Search, ChevronDown, ChevronUp, Settings2, User, Package, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { createSalesOrder, getProductPrice } from '@/lib/services/sales'
import { getCustomers } from '@/lib/services/customers'
import { getProducts, getUnits, getProductUnits } from '@/lib/services/products'
import { getWarehouses } from '@/lib/services/inventory'
import { getActiveBranches } from '@/lib/services/geography'
import { getShippingCompanies } from '@/lib/services/shipping'
import { getActiveVaults, getActiveCustodyAccounts } from '@/lib/services/finance'
import type { SalesOrderItemInput, SalesOrderInput } from '@/lib/types/sales'
import type { PaymentTermsType, DeliveryMethod } from '@/lib/types/customers'
import { PAYMENT_TERMS_LABELS, DELIVERY_METHOD_LABELS } from '@/lib/types/customers'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useClickOutside } from '@/lib/hooks/useClickOutside'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface OrderItemRow {
    product_id: string
    product_name: string
    unit_id: string
    quantity: number
    unit_price: number
    discount_amount: number
    discount_percent: number
    tax_amount: number
    conversion_factor: number
    available_units: { id: string; name: string; conversion_factor: number }[]
    isNew?: boolean
}

interface CustomerOption {
    id: string; name: string; code: string | null
    payment_terms: PaymentTermsType; default_delivery_method: DeliveryMethod
    credit_limit: number; current_balance: number
    assigned_rep_id: string | null; price_list_id: string | null
}

export function SalesOrderFormPage() {
    usePageTitle('أمر بيع جديد')
    const navigate = useNavigate()
    const { profile, can } = useAuthStore()
    const isAdmin = can('*') || can('sales.orders.admin')

    // ── Lookups ────────────────────────────────────────────
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [products, setProducts] = useState<{ id: string; name: string; sku: string | null; unit_id: string }[]>([])
    const [units, setUnits] = useState<{ id: string; name: string; symbol: string; conversion_factor?: number }[]>([])
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
    const [shippingCompanies, setShippingCompanies] = useState<{ id: string; name: string }[]>([])
    const [vaults, setVaults] = useState<{ id: string; name: string }[]>([])
    const [custodyAccounts, setCustodyAccounts] = useState<{ id: string; employee: any; current_balance: number }[]>([])

    // ── Form state ─────────────────────────────────────────
    const [customerId, setCustomerId] = useState('')
    const [warehouseId, setWarehouseId] = useState('')
    const [branchId, setBranchId] = useState('')
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]!)
    const [paymentMethod, setPaymentMethod] = useState<PaymentTermsType>('cash')
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('direct')
    const [shippingCompanyId, setShippingCompanyId] = useState('')
    const [vaultId, setVaultId] = useState('')
    const [custodyId, setCustodyId] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<OrderItemRow[]>([])
    const [saving, setSaving] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // User's own custody for auto-assignment (reps)
    const [userCustodyId, setUserCustodyId] = useState<string | null>(null)

    // ── Customer search (professional combobox) ────────────
    const [customerSearch, setCustomerSearch] = useState('')
    const debouncedCustomerSearch = useDebounce(customerSearch)
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
    const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([])
    const [selectedCustomerIdx, setSelectedCustomerIdx] = useState(-1)
    const customerInputRef = useRef<HTMLInputElement>(null)
    const customerDropdownRef = useClickOutside<HTMLDivElement>(() => setShowCustomerDropdown(false), showCustomerDropdown)

    // ── Product search ─────────────────────────────────────
    const [productSearch, setProductSearch] = useState('')
    const debouncedSearch = useDebounce(productSearch)
    const [filteredProducts, setFilteredProducts] = useState<typeof products>([])
    const [showProductDropdown, setShowProductDropdown] = useState(false)
    const productDropdownRef = useClickOutside<HTMLDivElement>(() => setShowProductDropdown(false), showProductDropdown)

    const selectedCustomer = customers.find(c => c.id === customerId)

    // ── Load lookups ───────────────────────────────────────
    useEffect(() => {
        Promise.all([
            getCustomers({ pageSize: 500 }),
            getProducts({ pageSize: 500 }),
            getUnits(),
            getWarehouses(),
            getActiveBranches(),
            getShippingCompanies(),
            getActiveVaults(),
            getActiveCustodyAccounts(),
        ]).then(async ([c, p, u, w, b, s, v, ca]) => {
            // Customers
            const custs = (c.data || []).map((x: any) => ({
                id: x.id, name: x.name, code: x.code,
                payment_terms: x.payment_terms || 'cash',
                default_delivery_method: x.default_delivery_method || 'direct',
                credit_limit: x.credit_limit || 0,
                current_balance: x.current_balance || 0,
                assigned_rep_id: x.assigned_rep_id || null,
                price_list_id: x.price_list_id || null,
            }))
            setCustomers(custs)
            setFilteredCustomers(custs)

            // Products
            const prods = (p.data || []).map((x: any) => ({
                id: x.id, name: x.name, sku: x.sku, unit_id: x.unit_id || '',
            }))
            setProducts(prods)
            setFilteredProducts(prods)

            // Units
            setUnits((u || []).map((x: any) => ({ id: x.id, name: x.name, symbol: x.symbol, conversion_factor: x.conversion_factor })))

            // Warehouses — auto-select user's assigned warehouse
            const wList = (w || []).map((x: any) => ({ id: x.id, name: x.name, assigned_rep_id: x.assigned_rep_id || null }))
            setWarehouses(wList.map(w => ({ id: w.id, name: w.name })))
            const userId = profile?.id
            if (userId) {
                const userWarehouse = wList.find((wh: any) => wh.assigned_rep_id === userId)
                if (userWarehouse) setWarehouseId(userWarehouse.id)
                else if (wList.length === 1 && wList[0]) setWarehouseId(wList[0].id)
            } else if (wList.length === 1 && wList[0]) {
                setWarehouseId(wList[0].id)
            }

            // Branches — auto-select first (or only)
            const bList = b || []
            setBranches(bList)
            if (bList.length >= 1 && bList[0]) setBranchId(bList[0].id)

            // Shipping, Vaults, Custody
            setShippingCompanies((s || []).map((x: any) => ({ id: x.id, name: x.name })))
            setVaults((v || []).map((x: any) => ({ id: x.id, name: x.name })))
            setCustodyAccounts(ca || [])

            // Find user's custody account for auto-assignment
            if (userId) {
                try {
                    const { data: empData } = await supabase
                        .from('employees')
                        .select('id')
                        .eq('profile_id', userId)
                        .maybeSingle()
                    if (empData) {
                        // Query custody directly by employee_id
                        const { data: custData } = await supabase
                            .from('custody_accounts')
                            .select('id')
                            .eq('employee_id', empData.id)
                            .eq('is_active', true)
                            .maybeSingle()
                        if (custData) {
                            setUserCustodyId(custData.id)
                            // For non-admin users, auto-assign custody on cash payment
                            if (!isAdmin) {
                                setCustodyId(custData.id)
                            }
                        }
                    }
                } catch { /* no employee/custody — fine */ }
            }
        }).catch(() => toast.error('خطأ في تحميل البيانات'))
    }, [profile?.id, isAdmin])

    // ── Customer search filter ─────────────────────────────
    useEffect(() => {
        if (!debouncedCustomerSearch) {
            setFilteredCustomers(customers)
        } else {
            const s = debouncedCustomerSearch.toLowerCase()
            setFilteredCustomers(customers.filter(c =>
                c.name.toLowerCase().includes(s) ||
                (c.code && c.code.toLowerCase().includes(s))
            ))
        }
        setSelectedCustomerIdx(-1)
    }, [debouncedCustomerSearch, customers])

    // ── Product search filter ──────────────────────────────
    useEffect(() => {
        if (!debouncedSearch) setFilteredProducts(products)
        else setFilteredProducts(products.filter(p =>
            p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()))
        ))
    }, [debouncedSearch, products])

    // ── Customer selection (with smart defaults) ───────────
    const selectCustomer = useCallback((id: string) => {
        setCustomerId(id)
        setShowCustomerDropdown(false)
        const cust = customers.find(c => c.id === id)
        if (cust) {
            setCustomerSearch(cust.name)
            // Smart defaults from customer
            setPaymentMethod(cust.payment_terms)
            setDeliveryMethod(cust.default_delivery_method)
        }
    }, [customers])

    // ── Customer keyboard navigation ───────────────────────
    const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
        if (!showCustomerDropdown) return
        const list = filteredCustomers.slice(0, 20)
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedCustomerIdx(i => Math.min(i + 1, list.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedCustomerIdx(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' && selectedCustomerIdx >= 0 && list[selectedCustomerIdx]) {
            e.preventDefault()
            selectCustomer(list[selectedCustomerIdx]!.id)
        } else if (e.key === 'Escape') {
            setShowCustomerDropdown(false)
        }
    }

    // ── Add product ────────────────────────────────────────
    const addProduct = async (product: typeof products[0]) => {
        setShowProductDropdown(false)
        setProductSearch('')

        // Duplicate check — increment quantity
        const existingIdx = items.findIndex(i => i.product_id === product.id)
        if (existingIdx >= 0) {
            updateItem(existingIdx, 'quantity', (items[existingIdx]?.quantity || 0) + 1)
            toast.info(`تم زيادة كمية "${product.name}"`)
            return
        }

        // Get price
        let price = 0
        try {
            price = await getProductPrice(product.id, product.unit_id, customerId || null)
        } catch { /* use 0 */ }

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

        if (prodUnits.length === 0 && units.length > 0) {
            const firstUnit = units[0]!
            prodUnits = [{ id: firstUnit.id, name: firstUnit.name, conversion_factor: 1 }]
        }

        const selectedUnitId = product.unit_id || (prodUnits.length > 0 ? prodUnits[0]!.id : '')
        if (!selectedUnitId) {
            toast.error(`لا يمكن إضافة "${product.name}" — لا توجد وحدة محددة`)
            return
        }

        setItems(prev => [...prev, {
            product_id: product.id,
            product_name: product.name,
            unit_id: selectedUnitId,
            quantity: 1,
            unit_price: price,
            discount_amount: 0,
            discount_percent: 0,
            tax_amount: 0,
            conversion_factor: 1,
            available_units: prodUnits,
            isNew: true,
        }])
        setTimeout(() => setItems(prev => prev.map(i => ({ ...i, isNew: false }))), 1500)
    }

    // ── Item helpers ───────────────────────────────────────
    const updateItem = (idx: number, field: keyof OrderItemRow, value: number | string) => {
        setItems(prev => {
            const updated = [...prev]
            const item = { ...updated[idx]! }

            if (field === 'discount_percent') {
                const pct = Math.min(100, Math.max(0, Number(value)))
                item.discount_percent = pct
                item.discount_amount = Math.round((item.quantity * item.unit_price * pct / 100) * 100) / 100
            } else if (field === 'discount_amount') {
                const amt = Number(value)
                item.discount_amount = amt
                const lineValue = item.quantity * item.unit_price
                item.discount_percent = lineValue > 0 ? Math.round((amt / lineValue) * 10000) / 100 : 0
            } else {
                (item as any)[field] = value
            }

            updated[idx] = item
            return updated
        })
    }

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

    // ── Totals ─────────────────────────────────────────────
    const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)
    const totalDiscount = items.reduce((s, i) => s + i.discount_amount, 0)
    const totalTax = items.reduce((s, i) => s + i.tax_amount, 0)
    const grandTotal = subtotal - totalDiscount + totalTax
    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // Count filled advanced fields for badge
    const advancedFieldsCount = [
        branchId,
        deliveryMethod !== 'direct' ? deliveryMethod : '',
        shippingCompanyId,
        vaultId,
        custodyId,
        notes,
    ].filter(Boolean).length

    // ── Submit ──────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!customerId) { toast.error('يرجى اختيار العميل'); return }
        if (!warehouseId) { toast.error('يرجى اختيار المخزن'); return }
        if (items.length === 0) { toast.error('يرجى إضافة منتج واحد على الأقل'); return }
        if (paymentMethod === 'cash' && !vaultId && !custodyId) {
            toast.error('يرجى اختيار الخزنة أو العهدة للدفع النقدي')
            return
        }

        setSaving(true)
        const userId: string = profile?.id || ''
        try {
            const orderItems: SalesOrderItemInput[] = items.map(i => ({
                product_id: i.product_id,
                unit_id: i.unit_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                discount_amount: i.discount_amount,
                discount_percent: i.discount_percent,
                tax_amount: i.tax_amount,
                total: (i.quantity * i.unit_price) - i.discount_amount + i.tax_amount,
                conversion_factor: i.conversion_factor,
                base_quantity: i.quantity * i.conversion_factor,
            }))

            const orderInput: SalesOrderInput = {
                customer_id: customerId,
                sales_rep_id: null,
                warehouse_id: warehouseId,
                branch_id: branchId || null,
                order_date: orderDate,
                delivery_method: deliveryMethod,
                shipping_company_id: shippingCompanyId || null,
                delivery_address_id: null,
                payment_method: paymentMethod,
                vault_id: vaultId || null,
                custody_id: custodyId || null,
                notes: notes || null,
                items: orderItems,
            }
            const order = await createSalesOrder(orderInput, userId)

            toast.success(`تم إنشاء أمر البيع ${order.order_number}`)
            navigate(`/sales/${order.id}`)
        } catch (err: unknown) {
            toast.error((err as any)?.message || 'فشل الإنشاء')
        } finally {
            setSaving(false)
        }
    }

    // ══════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════
    return (
        <div className="space-y-5 animate-[fade-in_0.4s_ease-out]">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/sales')} className="btn btn-ghost">
                    <ArrowRight className="h-5 w-5" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <ShoppingCart className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">أمر بيع جديد</h1>
                    <p className="page-subtitle">اختر العميل ثم أضف المنتجات</p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                القسم 1: البيانات الأساسية (مرئي دائماً)
                ═══════════════════════════════════════════════════ */}
            <div className="edara-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-primary-500" />
                    <h2 className="text-base font-bold" >البيانات الأساسية</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ── Customer Search (Professional Combobox) ── */}
                    <div className="relative md:col-span-2" ref={customerDropdownRef}>
                        <label className="form-label">العميل *</label>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <input
                                ref={customerInputRef}
                                type="text"
                                value={customerSearch}
                                placeholder="ابحث بالاسم أو الكود..."
                                onChange={e => {
                                    setCustomerSearch(e.target.value)
                                    setShowCustomerDropdown(true)
                                    if (!e.target.value) setCustomerId('')
                                }}
                                onFocus={() => setShowCustomerDropdown(true)}
                                onKeyDown={handleCustomerKeyDown}
                                className="form-input"
                                style={{ paddingInlineStart: '2.5rem' }}
                                autoComplete="off"
                            />
                        </div>
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div
                                className="absolute z-30 top-full mt-1 w-full max-h-64 overflow-y-auto edara-card shadow-xl"
                                style={{ border: '1px solid var(--border-primary)' }}
                            >
                                {filteredCustomers.slice(0, 20).map((c, i) => (
                                    <div
                                        key={c.id}
                                        onClick={() => selectCustomer(c.id)}
                                        className="px-4 py-2.5 cursor-pointer transition-colors text-sm"
                                        style={{
                                            color: 'var(--text-primary)',
                                            borderBottom: '1px solid var(--border-primary)',
                                            backgroundColor: selectedCustomerIdx === i ? 'var(--empty-bg)' : undefined,
                                        }}
                                        onMouseEnter={() => setSelectedCustomerIdx(i)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                                                    style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-secondary)' }}>
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{c.name}</div>
                                                    {c.code && <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.code}</div>}
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-left" style={{ color: 'var(--text-muted)' }}>
                                                {PAYMENT_TERMS_LABELS[c.payment_terms]}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredCustomers.length > 20 && (
                                    <div className="px-4 py-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                                        +{filteredCustomers.length - 20} عميل آخر — حدد البحث
                                    </div>
                                )}
                            </div>
                        )}
                        {showCustomerDropdown && customerSearch && filteredCustomers.length === 0 && (
                            <div className="absolute z-30 top-full mt-1 w-full edara-card shadow-xl px-4 py-3 text-sm text-center"
                                style={{ border: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>
                                لا يوجد عميل بهذا الاسم
                            </div>
                        )}

                        {/* Customer info card */}
                        {selectedCustomer && (
                            <div className="mt-3 p-3 rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-3"
                                style={{ backgroundColor: 'var(--empty-bg)', border: '1px solid var(--border-primary)' }}>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>الرصيد الحالي</span>
                                    <div className="font-bold text-sm mt-0.5" style={{ color: selectedCustomer.current_balance > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                        {formatCurrency(selectedCustomer.current_balance)}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>الحد الائتماني</span>
                                    <div className="font-bold text-sm mt-0.5" >
                                        {formatCurrency(selectedCustomer.credit_limit)}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>شروط الدفع</span>
                                    <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                        {PAYMENT_TERMS_LABELS[selectedCustomer.payment_terms]}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>التوصيل</span>
                                    <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                        {DELIVERY_METHOD_LABELS[selectedCustomer.default_delivery_method]}
                                    </div>
                                </div>
                                {selectedCustomer.credit_limit > 0 && selectedCustomer.current_balance >= selectedCustomer.credit_limit * 0.8 && (
                                    <div className="col-span-2 sm:col-span-4">
                                        <div className="text-[11px] font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}>
                                            ⚠ العميل قريب من الحد الائتماني!
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Warehouse ── */}
                    <div>
                        <label className="form-label">المخزن *</label>
                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="form-input">
                            <option value="">— اختر المخزن —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    {/* ── Order Date ── */}
                    <div>
                        <label className="form-label">تاريخ الطلب *</label>
                        <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="form-input" />
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                القسم 2: إعدادات إضافية (قابل للطي)
                ═══════════════════════════════════════════════════ */}
            <div className="edara-card overflow-hidden">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        <span className="text-sm font-semibold">إعدادات إضافية</span>
                        {advancedFieldsCount > 0 && (
                            <span className="badge badge-primary text-[10px] px-1.5 py-0.5">{advancedFieldsCount}</span>
                        )}
                    </div>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAdvanced && (
                    <div className="px-5 pb-5 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        style={{ borderTop: '1px solid var(--border-primary)' }}>
                        {/* Payment Method */}
                        <div>
                            <label className="form-label">طريقة الدفع</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentTermsType)} className="form-input">
                                {(Object.entries(PAYMENT_TERMS_LABELS) as [PaymentTermsType, string][]).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Delivery Method */}
                        <div>
                            <label className="form-label">طريقة التوصيل</label>
                            <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value as DeliveryMethod)} className="form-input">
                                {(Object.entries(DELIVERY_METHOD_LABELS) as [DeliveryMethod, string][]).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Branch */}
                        <div>
                            <label className="form-label">الفرع</label>
                            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="form-input">
                                <option value="">— بدون —</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* Shipping Company — only when delivery = shipping_company */}
                        {deliveryMethod === 'shipping_company' && (
                            <div>
                                <label className="form-label">شركة الشحن</label>
                                <select value={shippingCompanyId} onChange={e => setShippingCompanyId(e.target.value)} className="form-input">
                                    <option value="">— اختر —</option>
                                    {shippingCompanies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Vault — only for cash */}
                        {paymentMethod === 'cash' && (
                            <div>
                                <label className="form-label">الخزنة</label>
                                <select
                                    value={vaultId}
                                    onChange={e => { setVaultId(e.target.value); if (e.target.value) setCustodyId('') }}
                                    className="form-input"
                                    disabled={!isAdmin && !!userCustodyId}
                                >
                                    <option value="">— اختر —</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                                {!isAdmin && userCustodyId && (
                                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                        كمندوب، يتم التحصيل على العهدة تلقائياً
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Custody — only for cash */}
                        {paymentMethod === 'cash' && (
                            <div>
                                <label className="form-label">
                                    العهدة
                                    {!isAdmin && userCustodyId && <span className="text-[10px] mr-1 badge badge-success">تلقائي</span>}
                                </label>
                                <select
                                    value={custodyId}
                                    onChange={e => { setCustodyId(e.target.value); if (e.target.value) setVaultId('') }}
                                    className="form-input"
                                    disabled={!isAdmin && !!userCustodyId}
                                >
                                    <option value="">— بدون —</option>
                                    {custodyAccounts.map(ca => (
                                        <option key={ca.id} value={ca.id}>
                                            {ca.employee?.profile?.full_name || '—'} ({formatCurrency(ca.current_balance)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="form-label">ملاحظات</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="form-input" rows={2} placeholder="ملاحظات على الطلب..." />
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                القسم 3: بنود الطلب
                ═══════════════════════════════════════════════════ */}
            <div className="edara-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary-500" />
                        <h2 className="text-base font-bold" >بنود الطلب</h2>
                    </div>
                    {items.length > 0 && (
                        <span className="badge badge-primary">{items.length} صنف</span>
                    )}
                </div>

                {/* Product search */}
                <div className="relative mb-4" ref={productDropdownRef}>
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="ابحث عن منتج لإضافته..." value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
                        onFocus={() => setShowProductDropdown(true)}
                        className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 w-full max-h-48 overflow-y-auto edara-card shadow-xl" style={{ border: '1px solid var(--border-primary)' }}>
                            {filteredProducts.slice(0, 15).map(p => (
                                <div key={p.id} onClick={() => addProduct(p)}
                                    className="px-4 py-2.5 cursor-pointer hover:opacity-80 text-sm flex items-center gap-2 transition-colors"
                                    style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <Plus className="h-3.5 w-3.5 text-primary-500" />
                                    <span className="font-medium">{p.name}</span>
                                    {p.sku && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({p.sku})</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Items table */}
                {items.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm" style={{ minWidth: '700px' }}>
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>الوحدة</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '75px' }}>الكمية</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>السعر</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '70px' }}>خصم %</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '95px' }}>مبلغ الخصم</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '90px' }}>الضريبة</th>
                                    <th style={{ color: 'var(--text-secondary)', width: '100px' }}>الإجمالي</th>
                                    <th style={{ width: '36px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const lineTotal = (item.quantity * item.unit_price) - item.discount_amount + item.tax_amount
                                    return (
                                        <tr key={idx} style={{
                                            transition: 'background 0.5s',
                                            background: item.isNew ? 'var(--color-primary-light, rgba(59,130,246,0.08))' : undefined,
                                            animation: item.isNew ? 'fade-in 0.3s ease-out' : undefined,
                                        }}>
                                            <td >
                                                <span className="font-medium">{item.product_name}</span>
                                            </td>
                                            <td>
                                                <select value={item.unit_id} onChange={e => {
                                                    const selUnit = item.available_units.find(u => u.id === e.target.value)
                                                    updateItem(idx, 'unit_id', e.target.value)
                                                    if (selUnit) updateItem(idx, 'conversion_factor', selUnit.conversion_factor)
                                                }} className="form-input text-xs py-1">
                                                    {(item.available_units.length > 0 ? item.available_units : units).map(u =>
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    )}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" min="0.01" step="0.01" value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                    className="form-input text-xs py-1 text-center" />
                                            </td>
                                            <td>
                                                <input type="number" min="0" step="0.01" value={item.unit_price}
                                                    onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                                                    className="form-input text-xs py-1 text-center" />
                                            </td>
                                            <td>
                                                <input type="number" min="0" max="100" step="0.1" value={item.discount_percent}
                                                    onChange={e => updateItem(idx, 'discount_percent', Number(e.target.value))}
                                                    className="form-input text-xs py-1 text-center" />
                                            </td>
                                            <td>
                                                <input type="number" min="0" step="0.01" value={item.discount_amount}
                                                    onChange={e => updateItem(idx, 'discount_amount', Number(e.target.value))}
                                                    className="form-input text-xs py-1 text-center" />
                                            </td>
                                            <td>
                                                <input type="number" min="0" step="0.01" value={item.tax_amount}
                                                    onChange={e => updateItem(idx, 'tax_amount', Number(e.target.value))}
                                                    className="form-input text-xs py-1 text-center" />
                                            </td>
                                            <td className="font-bold" >
                                                {formatCurrency(lineTotal)}
                                            </td>
                                            <td>
                                                <button onClick={() => removeItem(idx)} className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                    <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {items.length === 0 && (
                    <div className="edara-empty flex flex-col items-center gap-3 py-12">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                            <Package className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>ابحث عن منتج وأضفه للطلب</p>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                ملخص وإجراءات
                ═══════════════════════════════════════════════════ */}
            {items.length > 0 && (
                <div className="edara-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-4 w-4 text-primary-500" />
                        <h2 className="text-base font-bold" >الملخص</h2>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 text-sm">
                        <div className="flex items-center gap-8">
                            <span style={{ color: 'var(--text-secondary)' }}>المجموع الفرعي:</span>
                            <span className="font-semibold w-28 text-left" >{formatCurrency(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex items-center gap-8">
                                <span style={{ color: 'var(--color-danger)' }}>الخصم:</span>
                                <span className="font-semibold w-28 text-left" style={{ color: 'var(--color-danger)' }}>-{formatCurrency(totalDiscount)}</span>
                            </div>
                        )}
                        {totalTax > 0 && (
                            <div className="flex items-center gap-8">
                                <span style={{ color: 'var(--text-secondary)' }}>الضريبة:</span>
                                <span className="font-semibold w-28 text-left" >{formatCurrency(totalTax)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-8 pt-2 mt-1" >
                            <span className="text-base font-bold" >الإجمالي:</span>
                            <span className="text-lg font-bold w-28 text-left" style={{ color: 'var(--color-primary)' }}>{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>

                    {/* Credit check warning */}
                    {paymentMethod !== 'cash' && selectedCustomer && (
                        <div className="mt-4 p-3 rounded-xl text-sm" style={{
                            background: grandTotal + selectedCustomer.current_balance > selectedCustomer.credit_limit
                                ? 'var(--color-danger-light, rgba(239,68,68,0.1))'
                                : 'var(--color-success-light, rgba(34,197,94,0.1))',
                        }}>
                            <strong>فحص ائتماني:</strong>{' '}
                            الرصيد {formatCurrency(selectedCustomer.current_balance)} + الطلب {formatCurrency(grandTotal)} = {formatCurrency(selectedCustomer.current_balance + grandTotal)} / الحد {formatCurrency(selectedCustomer.credit_limit)}
                        </div>
                    )}
                </div>
            )}

            {/* ── Actions ─────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pb-4">
                <button onClick={() => navigate('/sales')} className="btn btn-secondary">إلغاء</button>
                <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
                    {saving ? 'جارٍ الحفظ...' : 'إنشاء أمر البيع'}
                </button>
            </div>
        </div>
    )
}
