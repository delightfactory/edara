import { useState, useEffect, useCallback } from 'react'
import {
    ArrowDownUp, Filter, ChevronLeft, ChevronRight, Plus,
    ArrowDownToLine, ArrowUpFromLine, AlertTriangle,
    RotateCcw, Trash2, Database, X, Loader2,
    ArrowLeftRight, CalendarDays, FileText, List, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCompanySettings } from '@/lib/services/settings'
import {
    getStockMovements, getWarehouses, createStockMovementsBatch, createTransferBatch,
    getProductLookups, getStockTransactions, getTransactionMovements,
} from '@/lib/services/inventory'
import type { StockMovementWithRefs, MovementType, StockTransactionWithRefs } from '@/lib/types/inventory'
import { MOVEMENT_TYPE_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/types/inventory'
import type { TransactionType } from '@/lib/types/inventory'
import type { BatchMovementInput, BatchTransferInput, ProductLookup, MovementLineItem, TransferLineItem } from '@/lib/services/inventory'
import type { WarehouseWithRefs } from '@/lib/types/inventory'
import { useAuthStore } from '@/stores/auth-store'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

const MANUAL_MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
    { value: 'initial', label: 'رصيد افتتاحي' },
    { value: 'adjustment', label: 'تسوية مخزنية' },
    { value: 'scrap', label: 'إتلاف' },
    { value: 'purchase_in', label: 'استلام مشتريات' },
    { value: 'return_in', label: 'مرتجع عملاء' },
    { value: 'sales_out', label: 'صرف مبيعات' },
    { value: 'return_out', label: 'مرتجع مشتريات' },
]

const MOVEMENT_TYPE_ICONS: Record<MovementType, typeof ArrowDownToLine> = {
    purchase_in: ArrowDownToLine, sales_out: ArrowUpFromLine, transfer_in: ArrowDownToLine,
    transfer_out: ArrowUpFromLine, adjustment: AlertTriangle, return_in: RotateCcw,
    return_out: RotateCcw, scrap: Trash2, initial: Database,
}

const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
    purchase_in: 'text-success bg-emerald-50 dark:bg-emerald-950/30',
    sales_out: 'text-danger bg-red-50 dark:bg-red-950/30',
    transfer_in: 'text-info bg-blue-50 dark:bg-blue-950/30',
    transfer_out: 'text-warning bg-amber-50 dark:bg-amber-950/30',
    adjustment: 'text-warning bg-amber-50 dark:bg-amber-950/30',
    return_in: 'text-info bg-blue-50 dark:bg-blue-950/30',
    return_out: 'text-danger bg-red-50 dark:bg-red-950/30',
    scrap: 'text-danger bg-red-50 dark:bg-red-950/30',
    initial: 'text-primary-600 bg-primary-50 dark:bg-primary-950/30',
}

const TXN_TYPE_COLORS: Record<string, string> = {
    transfer: 'text-info bg-blue-50 dark:bg-blue-950/30',
    adjustment: 'text-warning bg-amber-50 dark:bg-amber-950/30',
    initial: 'text-primary-600 bg-primary-50 dark:bg-primary-950/30',
    scrap: 'text-danger bg-red-50 dark:bg-red-950/30',
    purchase_in: 'text-success bg-emerald-50 dark:bg-emerald-950/30',
    sales_out: 'text-danger bg-red-50 dark:bg-red-950/30',
    return_in: 'text-info bg-blue-50 dark:bg-blue-950/30',
    return_out: 'text-danger bg-red-50 dark:bg-red-950/30',
}

const IN_TYPES: MovementType[] = ['purchase_in', 'transfer_in', 'return_in', 'initial']

const formatDate = (d: string) => new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(d))

const emptyMovementLine = (): MovementLineItem & { _key: number } => ({
    product_id: '', quantity: 0, notes: '', _key: Date.now() + Math.random(),
})
const emptyTransferLine = (): TransferLineItem & { _key: number } => ({
    product_id: '', quantity: 0, _key: Date.now() + Math.random(),
})

export function StockMovementsPage() {
    usePageTitle('حركات المخزون')
    const { can } = useAuthStore()

    // ── Active tab ───────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'transactions' | 'movements'>('transactions')

    // ── Transactions state ───────────────────────────────────
    const [transactions, setTransactions] = useState<StockTransactionWithRefs[]>([])
    const [txnLoading, setTxnLoading] = useState(true)
    const [txnPage, setTxnPage] = useState(1)
    const [txnTotal, setTxnTotal] = useState(0)
    const [txnFilterType, setTxnFilterType] = useState('')
    const [txnDateFrom, setTxnDateFrom] = useState('')
    const [txnDateTo, setTxnDateTo] = useState('')

    // ── Transaction detail dialog ────────────────────────────
    const [detailTxn, setDetailTxn] = useState<StockTransactionWithRefs | null>(null)
    const [detailMovements, setDetailMovements] = useState<StockMovementWithRefs[]>([])
    const [detailLoading, setDetailLoading] = useState(false)

    // ── Movements state ──────────────────────────────────────
    const [movements, setMovements] = useState<StockMovementWithRefs[]>([])
    const [mvLoading, setMvLoading] = useState(true)
    const [mvPage, setMvPage] = useState(1)
    const [mvTotal, setMvTotal] = useState(0)
    const [filterWarehouse, setFilterWarehouse] = useState('')
    const [filterType, setFilterType] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // ── Shared state ─────────────────────────────────────────
    const [pageSize, setPageSize] = useState(25)
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [warehousesFull, setWarehousesFull] = useState<WarehouseWithRefs[]>([])
    const [products, setProducts] = useState<ProductLookup[]>([])
    const [saving, setSaving] = useState(false)

    // ── Create dialogs ───────────────────────────────────────
    const [showCreate, setShowCreate] = useState(false)
    const [showTransfer, setShowTransfer] = useState(false)

    const [mvType, setMvType] = useState<MovementType>('initial')
    const [mvWarehouse, setMvWarehouse] = useState('')
    const [mvDirection, setMvDirection] = useState<'in' | 'out'>('in')
    const [mvLines, setMvLines] = useState<(MovementLineItem & { _key: number })[]>([emptyMovementLine()])

    const [trFromWarehouse, setTrFromWarehouse] = useState('')
    const [trToWarehouse, setTrToWarehouse] = useState('')
    const [trNotes, setTrNotes] = useState('')
    const [trLines, setTrLines] = useState<(TransferLineItem & { _key: number })[]>([emptyTransferLine()])

    useEffect(() => {
        getCompanySettings().then(s => {
            const mr = s.find(c => c.key === 'max_rows_per_page')
            if (mr?.value) setPageSize(Math.min(Number(mr.value) || 25, 50))
        }).catch(() => { })
        getWarehouses().then(data => {
            setWarehousesFull(data)
            setWarehouses(data.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })))
        }).catch(() => { })
    }, [])

    // ── Load transactions ────────────────────────────────────
    const loadTxns = useCallback(async () => {
        setTxnLoading(true)
        try {
            const r = await getStockTransactions({
                page: txnPage, pageSize,
                transaction_type: txnFilterType || undefined,
                date_from: txnDateFrom || undefined,
                date_to: txnDateTo || undefined,
            })
            setTransactions(r.data)
            setTxnTotal(r.total)
        } catch { toast.error('فشل تحميل العمليات') }
        finally { setTxnLoading(false) }
    }, [txnPage, pageSize, txnFilterType, txnDateFrom, txnDateTo])

    useEffect(() => { if (activeTab === 'transactions') loadTxns() }, [loadTxns, activeTab])

    // ── Load movements ───────────────────────────────────────
    const loadMvs = useCallback(async () => {
        setMvLoading(true)
        try {
            const r = await getStockMovements({
                page: mvPage, pageSize,
                warehouse_id: filterWarehouse || undefined,
                movement_type: filterType || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            })
            setMovements(r.data)
            setMvTotal(r.total)
        } catch { toast.error('فشل تحميل الحركات') }
        finally { setMvLoading(false) }
    }, [mvPage, pageSize, filterWarehouse, filterType, dateFrom, dateTo])

    useEffect(() => { if (activeTab === 'movements') loadMvs() }, [loadMvs, activeTab])

    // ── Open transaction detail ──────────────────────────────
    const openDetail = async (txn: StockTransactionWithRefs) => {
        setDetailTxn(txn)
        setDetailLoading(true)
        setDetailMovements([])
        try {
            const mvs = await getTransactionMovements(txn.id)
            setDetailMovements(mvs)
        } catch { toast.error('فشل تحميل تفاصيل العملية') }
        finally { setDetailLoading(false) }
    }

    // ── Form data loader ─────────────────────────────────────
    const loadFormData = async () => {
        try { const p = await getProductLookups(); setProducts(p) } catch { }
    }

    const openCreate = () => { loadFormData(); setMvType('initial'); setMvWarehouse(''); setMvDirection('in'); setMvLines([emptyMovementLine()]); setShowCreate(true) }
    const openTransfer = () => { loadFormData(); setTrFromWarehouse(''); setTrToWarehouse(''); setTrNotes(''); setTrLines([emptyTransferLine()]); setShowTransfer(true) }

    // ── Movement line helpers ────────────────────────────────
    const addMvLine = () => setMvLines(p => [...p, emptyMovementLine()])
    const removeMvLine = (k: number) => setMvLines(p => p.length > 1 ? p.filter(l => l._key !== k) : p)
    const updateMvLine = (k: number, f: string, v: string | number) => setMvLines(p => p.map(l => l._key === k ? { ...l, [f]: v } : l))

    const addTrLine = () => setTrLines(p => [...p, emptyTransferLine()])
    const removeTrLine = (k: number) => setTrLines(p => p.length > 1 ? p.filter(l => l._key !== k) : p)
    const updateTrLine = (k: number, f: string, v: string | number) => setTrLines(p => p.map(l => l._key === k ? { ...l, [f]: v } : l))

    // ── Submit handlers ──────────────────────────────────────
    const handleCreateMovement = async () => {
        const valid = mvLines.filter(l => l.product_id && l.quantity > 0)
        if (!mvWarehouse || !mvType || valid.length === 0) { toast.error('يرجى ملء الحقول المطلوبة'); return }
        const ids = valid.map(l => l.product_id)
        if (new Set(ids).size !== ids.length) { toast.error('لا يمكن تكرار نفس المنتج'); return }
        setSaving(true)
        try {
            const input: BatchMovementInput = { warehouse_id: mvWarehouse, movement_type: mvType, direction: mvType === 'adjustment' ? mvDirection : 'in', items: valid.map(l => ({ product_id: l.product_id, quantity: l.quantity, notes: l.notes })) }
            await createStockMovementsBatch(input)
            toast.success(`تم تسجيل ${valid.length} حركة بنجاح`)
            setShowCreate(false)
            loadTxns(); if (activeTab === 'movements') loadMvs()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'فشل تسجيل الحركات') }
        finally { setSaving(false) }
    }

    const handleCreateTransfer = async () => {
        const valid = trLines.filter(l => l.product_id && l.quantity > 0)
        if (!trFromWarehouse || !trToWarehouse || valid.length === 0) { toast.error('يرجى ملء الحقول المطلوبة'); return }
        if (trFromWarehouse === trToWarehouse) { toast.error('لا يمكن التحويل لنفس المخزن'); return }
        const ids = valid.map(l => l.product_id)
        if (new Set(ids).size !== ids.length) { toast.error('لا يمكن تكرار نفس المنتج'); return }
        setSaving(true)
        try {
            const input: BatchTransferInput = { from_warehouse_id: trFromWarehouse, to_warehouse_id: trToWarehouse, items: valid.map(l => ({ product_id: l.product_id, quantity: l.quantity })), notes: trNotes || null }
            await createTransferBatch(input)
            toast.success(`تم تحويل ${valid.length} منتج بنجاح`)
            setShowTransfer(false)
            loadTxns(); if (activeTab === 'movements') loadMvs()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'فشل التحويل') }
        finally { setSaving(false) }
    }

    const ProductSelect = ({ value, onChange, usedIds }: { value: string; onChange: (v: string) => void; usedIds: string[] }) => (
        <select value={value} onChange={e => onChange(e.target.value)} className="form-input text-sm py-1.5">
            <option value="">— منتج —</option>
            {products.map(p => (
                <option key={p.id} value={p.id} disabled={usedIds.includes(p.id) && p.id !== value}>
                    {p.name} {p.sku && `(${p.sku})`}
                </option>
            ))}
        </select>
    )

    const txnTotalPages = Math.ceil(txnTotal / pageSize)
    const mvTotalPages = Math.ceil(mvTotal / pageSize)

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <ArrowDownUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">حركات المخزون</h1>
                        <p className="page-subtitle">إدارة التحويلات والتسويات</p>
                    </div>
                </div>
                {can('inventory.stock.create') && (
                    <div className="flex items-center gap-2">
                        <button onClick={openTransfer} className="btn btn-secondary"><ArrowLeftRight className="h-4 w-4" /> تحويل</button>
                        <button onClick={openCreate} className="btn btn-primary"><Plus className="h-4 w-4" /> حركة جديدة</button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                <button onClick={() => setActiveTab('transactions')} className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === 'transactions' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'hover:bg-white/50')} style={{ color: activeTab === 'transactions' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <FileText className="h-4 w-4" /> العمليات {txnTotal > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600">{txnTotal}</span>}
                </button>
                <button onClick={() => setActiveTab('movements')} className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === 'movements' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'hover:bg-white/50')} style={{ color: activeTab === 'movements' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <List className="h-4 w-4" /> سجل الحركات
                </button>
            </div>

            {/* ══════════════ TRANSACTIONS TAB ══════════════ */}
            {activeTab === 'transactions' && (
                <>
                    <div className="edara-card p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1" style={{ minWidth: '8rem' }}>
                                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <select value={txnFilterType} onChange={e => { setTxnFilterType(e.target.value); setTxnPage(1) }} className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                                    <option value="">كل الأنواع</option>
                                    {(Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div className="relative flex-1" style={{ minWidth: '7rem' }}>
                                <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <input type="date" value={txnDateFrom} onChange={e => { setTxnDateFrom(e.target.value); setTxnPage(1) }} className="form-input text-xs" style={{ paddingInlineStart: '2.25rem' }} title="من تاريخ" />
                            </div>
                            <div className="relative flex-1" style={{ minWidth: '7rem' }}>
                                <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <input type="date" value={txnDateTo} onChange={e => { setTxnDateTo(e.target.value); setTxnPage(1) }} className="form-input text-xs" style={{ paddingInlineStart: '2.25rem' }} title="إلى تاريخ" />
                            </div>
                        </div>
                    </div>

                    <div className="edara-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ minWidth: '700px' }}>
                                <thead><tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>رقم العملية</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>النوع</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المخازن</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الأصناف</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>بواسطة</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>التاريخ</th>
                                    <th className="px-4 py-3 w-10" />
                                </tr></thead>
                                <tbody>
                                    {txnLoading ? Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>)}</tr>
                                    )) : transactions.length === 0 ? (
                                        <tr><td colSpan={8} className="px-4 py-16 text-center"><FileText className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-muted)' }}>لا توجد عمليات</p></td></tr>
                                    ) : transactions.map((t, i) => {
                                        const warehouseText = t.transaction_type === 'transfer'
                                            ? `${t.from_warehouse?.name || '—'} → ${t.to_warehouse?.name || '—'}`
                                            : t.warehouse?.name || '—'
                                        return (
                                            <tr key={t.id} className="edara-tr-hover cursor-pointer" onClick={() => openDetail(t)}
                                                style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 30}ms backwards` }}>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-primary)' }} dir="ltr">{t.transaction_number}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', TXN_TYPE_COLORS[t.transaction_type] || '')}>
                                                        {TRANSACTION_TYPE_LABELS[t.transaction_type as TransactionType] || t.transaction_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{warehouseText}</td>
                                                <td className="px-4 py-3 text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{t.items_count}</td>
                                                <td className="px-4 py-3 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{t.total_quantity}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{t.creator?.full_name || '—'}</td>
                                                <td className="px-4 py-3 text-xs" dir="ltr" style={{ color: 'var(--text-muted)' }}>{formatDate(t.created_at)}</td>
                                                <td className="px-4 py-3"><Eye className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {txnTotalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {txnPage} من {txnTotalPages}</p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setTxnPage(Math.max(1, txnPage - 1))} disabled={txnPage <= 1} className="btn btn-ghost btn-icon disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                                    <button onClick={() => setTxnPage(Math.min(txnTotalPages, txnPage + 1))} disabled={txnPage >= txnTotalPages} className="btn btn-ghost btn-icon disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════ MOVEMENTS TAB ══════════════ */}
            {activeTab === 'movements' && (
                <>
                    <div className="edara-card p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1"><Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <select value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setMvPage(1) }} className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                                    <option value="">كل المخازن</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select></div>
                            <div className="relative flex-1"><Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <select value={filterType} onChange={e => { setFilterType(e.target.value); setMvPage(1) }} className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                                    <option value="">كل الأنواع</option>{(Object.entries(MOVEMENT_TYPE_LABELS) as [MovementType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select></div>
                            <div className="relative flex-1"><CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setMvPage(1) }} className="form-input text-xs" style={{ paddingInlineStart: '2.25rem' }} /></div>
                            <div className="relative flex-1"><CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setMvPage(1) }} className="form-input text-xs" style={{ paddingInlineStart: '2.25rem' }} /></div>
                        </div>
                    </div>

                    <div className="edara-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ minWidth: '800px' }}>
                                <thead><tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>النوع</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المخزن</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المرجع</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>بواسطة</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>التاريخ</th>
                                </tr></thead>
                                <tbody>
                                    {mvLoading ? Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>)}</tr>
                                    )) : movements.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-16 text-center"><ArrowDownUp className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-muted)' }}>لا توجد حركات</p></td></tr>
                                    ) : movements.map((m, i) => {
                                        const Icon = MOVEMENT_TYPE_ICONS[m.movement_type] || ArrowDownUp
                                        const isIn = IN_TYPES.includes(m.movement_type)
                                        return (
                                            <tr key={m.id} className="edara-tr-hover" style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 30}ms backwards` }}>
                                                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', MOVEMENT_TYPE_COLORS[m.movement_type])}><Icon className="h-3.5 w-3.5" /></div><span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{MOVEMENT_TYPE_LABELS[m.movement_type]}</span></div></td>
                                                <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.product?.name || '—'}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.warehouse?.name || '—'}</td>
                                                <td className="px-4 py-3"><span className={cn('text-sm font-bold tabular-nums', isIn ? 'text-success' : 'text-danger')} dir="ltr">{isIn ? '+' : '-'}{m.quantity}</span></td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{m.reference_type || '—'}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.creator?.full_name || '—'}</td>
                                                <td className="px-4 py-3 text-xs" dir="ltr" style={{ color: 'var(--text-muted)' }}>{formatDate(m.created_at)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {mvTotalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>صفحة {mvPage} من {mvTotalPages}</p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setMvPage(Math.max(1, mvPage - 1))} disabled={mvPage <= 1} className="btn btn-ghost btn-icon disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                                    <button onClick={() => setMvPage(Math.min(mvTotalPages, mvPage + 1))} disabled={mvPage >= mvTotalPages} className="btn btn-ghost btn-icon disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════ TRANSACTION DETAIL DIALOG ══════════════ */}
            {detailTxn && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] sm:pt-[5vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(6px)' }} onClick={() => setDetailTxn(null)} />
                    <div className="relative w-full max-w-3xl rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] max-h-[90vh] flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                        {/* ── Header ── */}
                        <div className={cn(
                            'relative px-6 py-5 text-white shrink-0 overflow-hidden',
                            detailTxn.transaction_type === 'transfer' ? 'bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-700' :
                            detailTxn.transaction_type === 'adjustment' ? 'bg-gradient-to-l from-amber-500 via-amber-600 to-orange-600' :
                            detailTxn.transaction_type === 'scrap' ? 'bg-gradient-to-l from-red-500 via-red-600 to-rose-700' :
                            'bg-gradient-to-l from-primary-500 via-primary-600 to-primary-700'
                        )}>
                            {/* Decorative circles */}
                            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-12 -translate-y-12" />
                            <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5 translate-x-8 translate-y-8" />

                            <div className="relative flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shrink-0">
                                        {detailTxn.transaction_type === 'transfer' ? <ArrowLeftRight className="h-6 w-6" /> :
                                         detailTxn.transaction_type === 'scrap' ? <Trash2 className="h-6 w-6" /> :
                                         detailTxn.transaction_type === 'adjustment' ? <AlertTriangle className="h-6 w-6" /> :
                                         <Database className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">{TRANSACTION_TYPE_LABELS[detailTxn.transaction_type as TransactionType] || detailTxn.transaction_type}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm text-white/80 font-mono tracking-wider" dir="ltr">{detailTxn.transaction_number}</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-sm">{detailTxn.status === 'completed' ? '✓ مكتمل' : detailTxn.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setDetailTxn(null)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/25 transition-colors shrink-0 mt-1"><X className="h-4 w-4" /></button>
                            </div>
                        </div>

                        {/* ── Content ── */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* Transfer flow visualization */}
                            {detailTxn.transaction_type === 'transfer' && (
                                <div className="flex items-center justify-center gap-3 py-4 px-4 rounded-xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                        <ArrowUpFromLine className="h-4 w-4 text-danger shrink-0" />
                                        <div className="text-center">
                                            <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>من مخزن</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{detailTxn.from_warehouse?.name || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="w-12 h-[2px] bg-gradient-to-l from-emerald-500 to-blue-500 rounded-full" />
                                        <ArrowLeftRight className="h-4 w-4 text-primary-500" />
                                        <div className="w-12 h-[2px] bg-gradient-to-l from-blue-500 to-emerald-500 rounded-full" />
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                        <ArrowDownToLine className="h-4 w-4 text-success shrink-0" />
                                        <div className="text-center">
                                            <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>إلى مخزن</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{detailTxn.to_warehouse?.name || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Info grid */}
                            <div className={cn('grid gap-3', detailTxn.transaction_type === 'transfer' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
                                {detailTxn.transaction_type !== 'transfer' && (
                                    <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-primary-50 dark:bg-primary-950/30">
                                            <Database className="h-4 w-4 text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>المخزن</p>
                                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{detailTxn.warehouse?.name || '—'}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-blue-50 dark:bg-blue-950/30">
                                        <List className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>الأصناف</p>
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{detailTxn.items_count}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-emerald-50 dark:bg-emerald-950/30">
                                        <ArrowDownUp className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>إجمالي الكمية</p>
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{detailTxn.total_quantity}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-violet-50 dark:bg-violet-950/30">
                                        <CalendarDays className="h-4 w-4 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>التاريخ</p>
                                        <p className="text-xs font-semibold" dir="ltr" style={{ color: 'var(--text-primary)' }}>{formatDate(detailTxn.created_at)}</p>
                                    </div>
                                </div>
                                {detailTxn.creator && (
                                    <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-pink-50 dark:bg-pink-950/30">
                                            <span className="text-xs font-bold text-pink-600">{detailTxn.creator.full_name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>بواسطة</p>
                                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{detailTxn.creator.full_name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {detailTxn.notes && (
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border-r-4 border-r-primary-400" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                    <FileText className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detailTxn.notes}</p>
                                </div>
                            )}

                            {/* Items table */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>تفاصيل الأصناف</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>{detailMovements.length} حركة</span>
                                </div>
                                {detailLoading ? (
                                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
                                ) : detailMovements.length === 0 ? (
                                    <div className="text-center py-10 rounded-xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                        <List className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد حركات مرتبطة بهذه العملية</p>
                                    </div>
                                ) : detailTxn.transaction_type === 'transfer' ? (
                                    /* ── Transfer: merged view (one row per product) ── */
                                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
                                        <table className="w-full">
                                            <thead>
                                                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase w-8" style={{ color: 'var(--text-muted)' }}>#</th>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية المحوّلة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    // Group by product — take only transfer_out to avoid duplicate rows
                                                    const outMvs = detailMovements.filter(m => m.movement_type === 'transfer_out')
                                                    return outMvs.map((m, i) => (
                                                        <tr key={m.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                                                            style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.25s ease-out ${i * 50}ms backwards` }}>
                                                            <td className="px-3 py-3.5 text-center">
                                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>{i + 1}</span>
                                                            </td>
                                                            <td className="px-3 py-3.5">
                                                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.product?.name || '—'}</p>
                                                            </td>
                                                            <td className="px-3 py-3.5 text-left">
                                                                <span className="text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-info" dir="ltr">
                                                                    {m.quantity}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    /* ── Non-transfer: full detail view ── */
                                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
                                        <table className="w-full">
                                            <thead>
                                                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase w-8" style={{ color: 'var(--text-muted)' }}>#</th>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحركة</th>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</th>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المخزن</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailMovements.map((m, i) => {
                                                    const isIn = IN_TYPES.includes(m.movement_type)
                                                    const Icon = MOVEMENT_TYPE_ICONS[m.movement_type] || ArrowDownUp
                                                    return (
                                                        <tr key={m.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                                                            style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.25s ease-out ${i * 50}ms backwards` }}>
                                                            <td className="px-3 py-3 text-center">
                                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>{i + 1}</span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium', MOVEMENT_TYPE_COLORS[m.movement_type])}>
                                                                    <Icon className="h-3 w-3" />
                                                                    {MOVEMENT_TYPE_LABELS[m.movement_type]}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.product?.name || '—'}</p>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.warehouse?.name || '—'}</p>
                                                            </td>
                                                            <td className="px-3 py-3 text-left">
                                                                <span className={cn('text-sm font-bold tabular-nums px-2 py-0.5 rounded-md', isIn ? 'text-success bg-emerald-50 dark:bg-emerald-950/30' : 'text-danger bg-red-50 dark:bg-red-950/30')} dir="ltr">
                                                                    {isIn ? '+' : '-'}{m.quantity}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="flex items-center justify-between px-6 py-3.5 shrink-0" style={{ borderTop: '1px solid var(--divider-color)', backgroundColor: 'var(--empty-bg)' }}>
                            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                                ✦ عملية ذرية — إما تنجح كلها أو تفشل كلها
                            </p>
                            <button onClick={() => setDetailTxn(null)} className="btn btn-secondary btn-sm">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ CREATE MOVEMENT DIALOG ══════════════ */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] sm:pt-[5vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreate(false)} />
                    <div className="relative w-full max-w-2xl rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-4 text-white rounded-t-2xl shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Plus className="h-4 w-4" /></div><div><h3 className="font-bold">حركة مخزون جديدة</h3><p className="text-xs text-white/70">أضف منتجات متعددة في عملية واحدة</p></div></div>
                                <button onClick={() => setShowCreate(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="h-4 w-4" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>نوع الحركة *</label>
                                    <select value={mvType} onChange={e => { setMvType(e.target.value as MovementType); if (e.target.value !== 'adjustment') setMvDirection('in') }} className="form-input">{MANUAL_MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                                <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المخزن *</label>
                                    <select value={mvWarehouse} onChange={e => setMvWarehouse(e.target.value)} className="form-input"><option value="">— اختر المخزن —</option>{warehousesFull.filter(w => w.is_active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                            </div>
                            {mvType === 'adjustment' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اتجاه التسوية *</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setMvDirection('in')}
                                            className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                                                mvDirection === 'in' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-success' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800')}
                                            style={mvDirection !== 'in' ? { color: 'var(--text-muted)', borderColor: 'var(--divider-color)' } : {}}>
                                            <ArrowDownToLine className="h-4 w-4" /> زيادة الرصيد
                                        </button>
                                        <button type="button" onClick={() => setMvDirection('out')}
                                            className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                                                mvDirection === 'out' ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-danger' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800')}
                                            style={mvDirection !== 'out' ? { color: 'var(--text-muted)', borderColor: 'var(--divider-color)' } : {}}>
                                            <ArrowUpFromLine className="h-4 w-4" /> نقص الرصيد
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="flex items-center justify-between mb-2"><label className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>المنتجات ({mvLines.length})</label><button onClick={addMvLine} className="btn btn-ghost btn-sm text-xs text-primary-600"><Plus className="h-3 w-3" /> سطر</button></div>
                                <div className="grid gap-2 mb-1.5" style={{ gridTemplateColumns: '1fr 5rem 1fr 2rem' }}>
                                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</span><span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية</span><span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>ملاحظات</span><span />
                                </div>
                                <div className="space-y-2">{mvLines.map((l, i) => (
                                    <div key={l._key} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 5rem 1fr 2rem', animation: `fade-in 0.2s ease-out ${i * 40}ms backwards` }}>
                                        <ProductSelect value={l.product_id} onChange={v => updateMvLine(l._key, 'product_id', v)} usedIds={mvLines.map(x => x.product_id).filter(Boolean)} />
                                        <input type="number" value={l.quantity || ''} onChange={e => updateMvLine(l._key, 'quantity', Number(e.target.value))} className="form-input text-sm py-1.5" dir="ltr" min={0.01} step="0.01" />
                                        <input type="text" value={l.notes || ''} onChange={e => updateMvLine(l._key, 'notes', e.target.value)} className="form-input text-sm py-1.5" placeholder="ملاحظة..." />
                                        <button onClick={() => removeMvLine(l._key)} disabled={mvLines.length <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-20"><Trash2 className="h-3 w-3 text-red-500" /></button>
                                    </div>
                                ))}</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>✦ عملية ذرية برقم مرجعي فريد</p>
                            <div className="flex items-center gap-3"><button onClick={() => setShowCreate(false)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleCreateMovement} disabled={saving} className="btn btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />} تسجيل {mvLines.filter(l => l.product_id && l.quantity > 0).length} حركة</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ TRANSFER DIALOG ══════════════ */}
            {showTransfer && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] sm:pt-[5vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowTransfer(false)} />
                    <div className="relative w-full max-w-2xl rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="bg-gradient-to-l from-blue-600 to-blue-700 px-6 py-4 text-white rounded-t-2xl shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><ArrowLeftRight className="h-4 w-4" /></div><div><h3 className="font-bold">تحويل بين مخازن</h3><p className="text-xs text-white/70">عملية ذرية برقم مرجعي فريد</p></div></div>
                                <button onClick={() => setShowTransfer(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="h-4 w-4" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>من مخزن *</label>
                                    <select value={trFromWarehouse} onChange={e => setTrFromWarehouse(e.target.value)} className="form-input"><option value="">— المصدر —</option>{warehousesFull.filter(w => w.is_active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                                <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>إلى مخزن *</label>
                                    <select value={trToWarehouse} onChange={e => setTrToWarehouse(e.target.value)} className="form-input"><option value="">— الوجهة —</option>{warehousesFull.filter(w => w.is_active && w.id !== trFromWarehouse).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ملاحظات</label>
                                <input type="text" value={trNotes} onChange={e => setTrNotes(e.target.value)} className="form-input" placeholder="سبب التحويل..." /></div>
                            <div>
                                <div className="flex items-center justify-between mb-2"><label className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>المنتجات ({trLines.length})</label><button onClick={addTrLine} className="btn btn-ghost btn-sm text-xs text-primary-600"><Plus className="h-3 w-3" /> سطر</button></div>
                                <div className="grid gap-2 mb-1.5" style={{ gridTemplateColumns: '1fr 6rem 2rem' }}><span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المنتج</span><span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الكمية</span><span /></div>
                                <div className="space-y-2">{trLines.map((l, i) => (
                                    <div key={l._key} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 6rem 2rem', animation: `fade-in 0.2s ease-out ${i * 40}ms backwards` }}>
                                        <ProductSelect value={l.product_id} onChange={v => updateTrLine(l._key, 'product_id', v)} usedIds={trLines.map(x => x.product_id).filter(Boolean)} />
                                        <input type="number" value={l.quantity || ''} onChange={e => updateTrLine(l._key, 'quantity', Number(e.target.value))} className="form-input text-sm py-1.5" dir="ltr" min={0.01} step="0.01" />
                                        <button onClick={() => removeTrLine(l._key)} disabled={trLines.length <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-20"><Trash2 className="h-3 w-3 text-red-500" /></button>
                                    </div>
                                ))}</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>✦ إما تنجح كل التحويلات أو تفشل جميعها</p>
                            <div className="flex items-center gap-3"><button onClick={() => setShowTransfer(false)} className="btn btn-secondary">إلغاء</button>
                                <button onClick={handleCreateTransfer} disabled={saving} className="btn btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />} تحويل {trLines.filter(l => l.product_id && l.quantity > 0).length} منتج</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
