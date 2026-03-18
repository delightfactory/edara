import { useState, useEffect } from 'react'
import {
    X, Loader2, UserCircle2, ToggleLeft, ToggleRight,
    Truck, Briefcase,
} from 'lucide-react'
import type { EmployeeWithRefs, EmployeeInput, SalesRepInput, RepType, DepartmentLookup } from '@/lib/types/hr'
import { REP_TYPE_LABELS } from '@/lib/types/hr'
import type { ProfileLookup } from '@/lib/types/inventory'
import { getActiveBranches } from '@/lib/services/geography'

interface EmployeeFormDialogProps {
    open: boolean
    employee: EmployeeWithRefs | null
    profiles: ProfileLookup[]
    departments: DepartmentLookup[]
    saving: boolean
    onClose: () => void
    onSave: (data: Partial<EmployeeInput>, repData: Partial<SalesRepInput> | null, isEdit: boolean) => void
}

export function EmployeeFormDialog({
    open, employee, profiles, departments, saving, onClose, onSave,
}: EmployeeFormDialogProps) {
    const [form, setForm] = useState<Partial<EmployeeInput>>({})
    const [isSalesRep, setIsSalesRep] = useState(false)
    const [repForm, setRepForm] = useState<Partial<SalesRepInput>>({})
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        getActiveBranches().then(setBranches).catch(() => {})
    }, [])

    useEffect(() => {
        if (open) {
            if (employee) {
                setForm({
                    profile_id: employee.profile_id,
                    employee_code: employee.employee_code,
                    department_id: employee.department_id,
                    job_title: employee.job_title,
                    hire_date: employee.hire_date,
                    salary: employee.salary,
                    branch_id: employee.branch_id ?? null,
                    is_active: employee.is_active,
                })
                if (employee.sales_rep) {
                    setIsSalesRep(true)
                    setRepForm({
                        rep_type: employee.sales_rep.rep_type,
                        territory: employee.sales_rep.territory,
                        vehicle_type: employee.sales_rep.vehicle_type,
                        max_customers: employee.sales_rep.max_customers,
                        is_active: employee.sales_rep.is_active,
                    })
                } else {
                    setIsSalesRep(false)
                    setRepForm({ rep_type: 'van_sales', territory: null, vehicle_type: null, max_customers: 100, is_active: true })
                }
            } else {
                setForm({
                    profile_id: '', employee_code: null, department_id: null,
                    job_title: null, hire_date: null, salary: 0, branch_id: null, is_active: true,
                })
                setIsSalesRep(false)
                setRepForm({ rep_type: 'van_sales', territory: null, vehicle_type: null, max_customers: 100, is_active: true })
            }
        }
    }, [open, employee])

    const handleSubmit = () => {
        if (!form.profile_id) return
        onSave(form, isSalesRep ? repForm : null, !!employee)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] p-4">
            <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

            <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] flex flex-col"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                {/* Gradient Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <UserCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{employee ? 'تعديل موظف' : 'إضافة موظف جديد'}</h2>
                                <p className="text-xs text-primary-200 mt-0.5">
                                    {employee ? `تعديل بيانات ${employee.profile?.full_name || ''}` : 'أدخل بيانات الموظف'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form — scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Profile (User) */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المستخدم (Profile) *</label>
                        <select value={form.profile_id || ''} onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))} className="form-input">
                            <option value="">— اختر المستخدم —</option>
                            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>كود الموظف</label>
                            <input type="text" value={form.employee_code || ''} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))}
                                className="form-input" dir="ltr" placeholder="EMP-001" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>المسمى الوظيفي</label>
                            <input type="text" value={form.job_title || ''} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                                className="form-input" placeholder="مثال: مندوب مبيعات أول" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>القسم</label>
                            <select value={form.department_id || ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value || null }))} className="form-input">
                                <option value="">— بدون قسم —</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>تاريخ التعيين</label>
                            <input type="date" value={form.hire_date || ''} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value || null }))}
                                className="form-input" dir="ltr" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الراتب الأساسي</label>
                        <input type="number" value={form.salary || 0} onChange={e => setForm(f => ({ ...f, salary: Number(e.target.value) }))}
                            className="form-input" dir="ltr" min={0} step="100" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الفرع</label>
                        <select value={form.branch_id || ''} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value || null }))} className="form-input">
                            <option value="">— بدون فرع —</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    {/* Active Toggle */}
                    <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                        className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                        style={{ backgroundColor: 'var(--empty-bg)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {form.is_active ? 'موظف نشط' : 'موظف معطّل'}
                        </span>
                        {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    <div className="edara-divider" />

                    {/* ─── Sales Rep Toggle ─────────────────────── */}
                    <button type="button" onClick={() => setIsSalesRep(!isSalesRep)}
                        className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                        style={{ backgroundColor: isSalesRep ? 'var(--color-primary-50)' : 'var(--empty-bg)' }}>
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" style={{ color: isSalesRep ? 'var(--color-primary-600)' : 'var(--text-muted)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {isSalesRep ? 'يعمل كمندوب / سائق توصيل' : 'ليس مندوباً'}
                            </span>
                        </div>
                        {isSalesRep ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    {/* ─── Conditional Sales Rep Fields ──────────── */}
                    {isSalesRep && (
                        <div className="space-y-4 rounded-xl p-4 border animate-[fade-in_0.3s_ease-out]"
                            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--empty-bg)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="h-4 w-4 text-primary-600" />
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>بيانات المندوب</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>نوع المندوب *</label>
                                <select value={repForm.rep_type || 'van_sales'}
                                    onChange={e => setRepForm(f => ({ ...f, rep_type: e.target.value as RepType }))}
                                    className="form-input">
                                    {(Object.entries(REP_TYPE_LABELS) as [RepType, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>منطقة التوزيع</label>
                                    <input type="text" value={repForm.territory || ''}
                                        onChange={e => setRepForm(f => ({ ...f, territory: e.target.value || null }))}
                                        className="form-input" placeholder="مثال: المنطقة الشمالية" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>نوع السيارة</label>
                                    <input type="text" value={repForm.vehicle_type || ''}
                                        onChange={e => setRepForm(f => ({ ...f, vehicle_type: e.target.value || null }))}
                                        className="form-input" placeholder="مثال: هايلكس 2024" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الحد الأقصى للعملاء</label>
                                <input type="number" value={repForm.max_customers || 100}
                                    onChange={e => setRepForm(f => ({ ...f, max_customers: Number(e.target.value) }))}
                                    className="form-input" dir="ltr" min={1} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving || !form.profile_id} className="btn btn-primary">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {employee ? 'تحديث' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    )
}
