import { useState, useEffect } from 'react'
import { X, Loader2, Warehouse as WarehouseIcon, ToggleLeft, ToggleRight } from 'lucide-react'
import type { WarehouseWithRefs, WarehouseInput, WarehouseType } from '@/lib/types/inventory'
import type { ProfileLookup } from '@/lib/types/inventory'
import { WAREHOUSE_TYPE_LABELS } from '@/lib/types/inventory'
import { getActiveBranches } from '@/lib/services/geography'

interface WarehouseFormDialogProps {
    open: boolean
    warehouse: WarehouseWithRefs | null
    profiles: ProfileLookup[]
    saving: boolean
    onClose: () => void
    onSave: (data: Partial<WarehouseInput>, isEdit: boolean) => void
}

export function WarehouseFormDialog({
    open, warehouse, profiles, saving, onClose, onSave,
}: WarehouseFormDialogProps) {
    const [form, setForm] = useState<Partial<WarehouseInput>>({})
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        getActiveBranches().then(setBranches).catch(() => {})
    }, [])

    useEffect(() => {
        if (open) {
            if (warehouse) {
                setForm({
                    name: warehouse.name,
                    location: warehouse.location,
                    type: warehouse.type,
                    manager_id: warehouse.manager_id,
                    assigned_rep_id: warehouse.assigned_rep_id,
                    branch_id: warehouse.branch_id ?? null,
                    is_active: warehouse.is_active,
                })
            } else {
                setForm({
                    name: '', location: '', type: 'main',
                    manager_id: null, assigned_rep_id: null, branch_id: null, is_active: true,
                })
            }
        }
    }, [open, warehouse])

    // Business rule: van → show rep, others → show manager
    const isVan = form.type === 'van'

    const handleTypeChange = (newType: WarehouseType) => {
        setForm(f => ({
            ...f,
            type: newType,
            // Reset the irrelevant field when type changes
            manager_id: newType === 'van' ? null : f.manager_id,
            assigned_rep_id: newType === 'van' ? f.assigned_rep_id : null,
        }))
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4">
            <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] overflow-hidden"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                {/* Gradient Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <WarehouseIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{warehouse ? 'تعديل مستودع' : 'إضافة مستودع جديد'}</h2>
                                <p className="text-xs text-primary-200 mt-0.5">{warehouse ? `تعديل ${warehouse.name}` : 'أدخل بيانات المستودع'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم المستودع *</label>
                        <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="form-input" placeholder="مثال: المستودع الرئيسي" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الموقع</label>
                        <input type="text" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            className="form-input" placeholder="مثال: المنطقة الصناعية - المدينة" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>نوع المستودع *</label>
                        <select value={form.type || 'main'} onChange={e => handleTypeChange(e.target.value as WarehouseType)} className="form-input">
                            {(Object.entries(WAREHOUSE_TYPE_LABELS) as [WarehouseType, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Conditional: Manager (for non-van) OR Rep (for van) */}
                    {isVan ? (
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                المندوب المسؤول
                                <span className="text-xs font-normal mr-2" style={{ color: 'var(--text-muted)' }}>(سيارة توزيع)</span>
                            </label>
                            <select value={form.assigned_rep_id || ''} onChange={e => setForm(f => ({ ...f, assigned_rep_id: e.target.value || null }))} className="form-input">
                                <option value="">— اختر المندوب —</option>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>مدير المخزن</label>
                            <select value={form.manager_id || ''} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value || null }))} className="form-input">
                                <option value="">— اختر المدير —</option>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Active toggle */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الفرع</label>
                        <select value={form.branch_id || ''} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value || null }))} className="form-input">
                            <option value="">— بدون فرع —</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                        className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                        style={{ backgroundColor: 'var(--empty-bg)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {form.is_active ? 'مستودع نشط' : 'مستودع معطّل'}
                        </span>
                        {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={() => onSave(form, !!warehouse)} disabled={saving || !form.name?.trim()} className="btn btn-primary">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {warehouse ? 'تحديث' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    )
}
