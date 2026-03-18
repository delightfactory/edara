import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getApprovalRules, createApprovalRule, updateApprovalRule, deleteApprovalRule } from '@/lib/services/finance'
import type { ApprovalRuleWithRefs, ApprovalRuleInput, ApprovalType } from '@/lib/types/finance'
import { APPROVAL_TYPE_LABELS } from '@/lib/types/finance'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

export function ApprovalRulesPage() {
    usePageTitle('قواعد الاعتماد')
    const { can } = useAuthStore()

    const [rules, setRules] = useState<ApprovalRuleWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [roles, setRoles] = useState<{ id: string; name: string }[]>([])
    const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([])

    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<ApprovalRuleWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const loadRules = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getApprovalRules()
            setRules(result.data)
        } catch {
            toast.error('حدث خطأ في تحميل القواعد')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadRules()
        // Load lookups
        Promise.all([
            supabase.from('roles').select('id, name').order('name'),
            supabase.from('profiles').select('id, full_name').order('full_name'),
        ]).then(([r, p]) => {
            setRoles((r.data || []) as { id: string; name: string }[])
            setProfiles((p.data || []) as { id: string; full_name: string }[])
        }).catch(() => { })
    }, [loadRules])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data: ApprovalRuleInput = {
            type: form.get('type') as ApprovalType,
            role_id: (form.get('role_id') as string) || null,
            user_id: (form.get('user_id') as string) || null,
            max_amount: Number(form.get('max_amount')) || 0,
            requires_escalation_above: Number(form.get('requires_escalation_above')) || null,
            is_active: form.get('is_active') === 'on',
        }

        if (!data.role_id && !data.user_id) {
            toast.error('يرجى تحديد الدور أو المستخدم')
            return
        }

        setSaving(true)
        try {
            if (editing) {
                await updateApprovalRule(editing.id, data)
                toast.success('تم تحديث القاعدة')
            } else {
                await createApprovalRule(data)
                toast.success('تم إنشاء القاعدة')
            }
            setShowForm(false)
            setEditing(null)
            loadRules()
        } catch {
            toast.error('فشل حفظ القاعدة')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteApprovalRule(id)
            toast.success('تم حذف القاعدة')
            loadRules()
        } catch {
            toast.error('فشل الحذف')
        } finally {
            setDeleting(null)
        }
    }

    const openEdit = (rule: ApprovalRuleWithRefs) => {
        setEditing(rule)
        setShowForm(true)
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">قواعد الاعتماد</h1>
                        <p className="page-subtitle">{rules.length} قاعدة</p>
                    </div>
                </div>
                {can('finance.settings.manage') && (
                    <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> قاعدة جديدة
                    </button>
                )}
            </div>

            <div className="edara-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>النوع</th>
                            <th>الدور</th>
                            <th>المستخدم</th>
                            <th>الحد الأقصى</th>
                            <th>تصعيد فوق</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="data-table-empty">جارٍ التحميل...</td></tr>
                        ) : rules.length === 0 ? (
                            <tr><td colSpan={7} className="data-table-empty">لا توجد قواعد اعتماد</td></tr>
                        ) : rules.map(r => (
                            <tr key={r.id}>
                                <td >{APPROVAL_TYPE_LABELS[r.type]}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.role?.name || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.user?.full_name || '—'}</td>
                                <td className="font-semibold" >{formatCurrency(r.max_amount)}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{r.requires_escalation_above ? formatCurrency(r.requires_escalation_above) : '—'}</td>
                                <td><span className={`badge ${r.is_active ? 'badge-success' : 'badge-secondary'}`}>{r.is_active ? 'مفعّل' : 'معطّل'}</span></td>
                                <td>
                                    {can('finance.settings.manage') && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(r)} className="btn btn-ghost text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => setConfirmId(r.id)} className="btn btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog open={!!confirmId} title="حذف القاعدة" message="هل أنت متأكد من حذف هذه القاعدة؟"
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowForm(false); setEditing(null) }}>
                    <div className="edara-card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" >{editing ? 'تعديل قاعدة' : 'قاعدة جديدة'}</h2>
                            <button onClick={() => { setShowForm(false); setEditing(null) }} className="btn btn-ghost"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="form-label">النوع *</label>
                                <select name="type" className="form-input" defaultValue={editing?.type || 'expense'} required>
                                    {(Object.entries(APPROVAL_TYPE_LABELS) as [ApprovalType, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">الدور</label>
                                <select name="role_id" className="form-input" defaultValue={editing?.role_id || ''}>
                                    <option value="">— بدون —</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">المستخدم</label>
                                <select name="user_id" className="form-input" defaultValue={editing?.user_id || ''}>
                                    <option value="">— بدون —</option>
                                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">الحد الأقصى للمبلغ *</label>
                                <input name="max_amount" type="number" min="0" step="0.01" className="form-input" defaultValue={editing?.max_amount || ''} required />
                            </div>
                            <div>
                                <label className="form-label">تصعيد فوق مبلغ</label>
                                <input name="requires_escalation_above" type="number" min="0" step="0.01" className="form-input" defaultValue={editing?.requires_escalation_above || ''} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input name="is_active" type="checkbox" id="is_active" defaultChecked={editing?.is_active !== false} />
                                <label htmlFor="is_active" className="form-label" style={{ marginBottom: 0 }}>مفعّل</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : editing ? 'تحديث' : 'إنشاء'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
