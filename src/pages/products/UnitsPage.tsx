import { useState, useEffect } from 'react'
import {
    Ruler, Plus, X, Loader2, Pencil, Trash2, Search,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getUnits, createUnit, updateUnit, deleteUnit } from '@/lib/services/products'
import type { Unit, UnitInput } from '@/lib/types/products'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function UnitsPage() {
    usePageTitle('وحدات القياس')
    const { can } = useAuthStore()
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Unit | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<UnitInput>>({})

    const loadUnits = async () => {
        setLoading(true)
        try {
            const data = await getUnits()
            setUnits(data)
        } catch {
            toast.error('فشل تحميل وحدات القياس')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadUnits() }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ name: '', symbol: '', base_unit_id: null, conversion_factor: 1 })
        setShowForm(true)
    }

    const openEdit = (u: Unit) => {
        setEditing(u)
        setForm({ name: u.name, symbol: u.symbol, base_unit_id: u.base_unit_id, conversion_factor: u.conversion_factor })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.name?.trim() || !form.symbol?.trim()) { toast.error('الاسم والرمز مطلوبان'); return }
        setSaving(true)
        try {
            if (editing) {
                await updateUnit(editing.id, form)
                toast.success('تم تحديث الوحدة')
            } else {
                await createUnit(form)
                toast.success('تم إنشاء الوحدة')
            }
            setShowForm(false)
            loadUnits()
        } catch {
            toast.error('فشلت العملية')
        } finally {
            setSaving(false)
        }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteUnit(id)
            toast.success('تم حذف الوحدة')
            loadUnits()
        } catch {
            toast.error('فشل الحذف — قد تكون مرتبطة بمنتجات')
        } finally {
            setDeleting(null)
        }
    }

    const filtered = search
        ? units.filter(u => u.name.includes(search) || u.symbol.includes(search))
        : units

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Ruler className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">وحدات القياس</h1>
                        <p className="page-subtitle">{units.length} وحدة</p>
                    </div>
                </div>
                {can('products.products.update') && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة وحدة
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="edara-card p-4">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="بحث بالاسم أو الرمز..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                </div>
            </div>

            {/* Table */}
            <div className="edara-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الاسم</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الرمز</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الوحدة الأساسية</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>معامل التحويل</th>
                                {can('products.products.update') && <th className="px-4 py-3 w-20"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-12" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <Ruler className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                        <p style={{ color: 'var(--text-muted)' }}>{search ? 'لا توجد نتائج' : 'لا توجد وحدات'}</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u, i) => {
                                    const baseUnit = u.base_unit_id ? units.find(bu => bu.id === u.base_unit_id) : null
                                    return (
                                        <tr key={u.id} className="edara-tr-hover"
                                            style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 30}ms backwards` }}>
                                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</td>
                                            <td className="px-4 py-3"><span className="badge badge-info">{u.symbol}</span></td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{baseUnit?.name || '— أساسية —'}</td>
                                            <td className="px-4 py-3 text-sm tabular-nums" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                                                {u.conversion_factor}
                                                {baseUnit && <span className="text-[10px] mr-2" style={{ color: 'var(--text-muted)' }}>(1 {u.name} = {u.conversion_factor} {baseUnit.name})</span>}
                                            </td>
                                            {can('products.products.update') && (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openEdit(u)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                            <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                        </button>
                                                        <button onClick={() => setConfirmId(u.id)} disabled={deleting === u.id} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-danger/10" title="حذف">
                                                            {deleting === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inline Dialog */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4">
                    <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out]"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-4 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold">{editing ? 'تعديل وحدة' : 'إضافة وحدة'}</h3>
                                <button onClick={() => setShowForm(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم الوحدة *</label>
                                <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="form-input" placeholder="مثال: كرتونة" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الرمز *</label>
                                <input type="text" value={form.symbol || ''} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                                    className="form-input" placeholder="مثال: كرتونة" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الوحدة الأساسية</label>
                                <select value={form.base_unit_id || ''} onChange={e => setForm(f => ({ ...f, base_unit_id: e.target.value || null }))} className="form-input">
                                    <option value="">— وحدة أساسية (مستقلة) —</option>
                                    {units.filter(u => u.id !== editing?.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>معامل التحويل</label>
                                <input type="number" value={form.conversion_factor || 1} onChange={e => setForm(f => ({ ...f, conversion_factor: Number(e.target.value) }))}
                                    className="form-input" dir="ltr" min={0.0001} step="0.01" />
                                {form.base_unit_id && (form.conversion_factor || 1) > 0 && (
                                    <p className="mt-2 text-xs font-medium px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
                                        💡 1 {form.name || 'وحدة'} = {form.conversion_factor || 1} {units.find(u => u.id === form.base_unit_id)?.name || 'وحدة أساسية'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                            <button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.symbol?.trim()} className="btn btn-primary">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editing ? 'تحديث' : 'إنشاء'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!confirmId} title="حذف الوحدة" message="هل أنت متأكد من حذف هذه الوحدة؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />
        </div>
    )
}
