import { useState, useEffect } from 'react'
import { Building2, Plus, Edit3, Trash2, Loader2, X, Users as UsersIcon, Save } from 'lucide-react'
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/services/settings'
import { getEmployeeCountByDepartment } from '@/lib/services/hr'
import { getProfiles } from '@/lib/services/auth'
import type { Profile } from '@/lib/types/database'
import { useAuthStore } from '@/stores/auth-store'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

interface DepartmentWithManager {
    id: string
    name: string
    parent_id: string | null
    manager_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    manager: { id: string; full_name: string } | null
}

export function DepartmentsPage() {
    usePageTitle('الأقسام')
    const { can } = useAuthStore()
    const [departments, setDepartments] = useState<DepartmentWithManager[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editDept, setEditDept] = useState<DepartmentWithManager | null>(null)
    const [form, setForm] = useState({ name: '', parent_id: '', manager_id: '' })
    const [saving, setSaving] = useState(false)
    const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [depts, profs, counts] = await Promise.all([getDepartments(), getProfiles(), getEmployeeCountByDepartment()])
            setDepartments(depts)
            setProfiles(profs)
            setEmployeeCounts(counts)
        } catch {
            toast.error('خطأ في تحميل البيانات')
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditDept(null)
        setForm({ name: '', parent_id: '', manager_id: '' })
        setShowModal(true)
    }

    const openEdit = (dept: DepartmentWithManager) => {
        setEditDept(dept)
        setForm({ name: dept.name, parent_id: dept.parent_id || '', manager_id: dept.manager_id || '' })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) return

        setSaving(true)
        try {
            const payload = {
                name: form.name.trim(),
                parent_id: form.parent_id || undefined,
                manager_id: form.manager_id || undefined,
            }

            if (editDept) {
                await updateDepartment(editDept.id, payload)
                toast.success('تم تعديل القسم بنجاح')
            } else {
                await createDepartment(payload)
                toast.success('تم إنشاء القسم بنجاح')
            }

            setShowModal(false)
            loadData()
        } catch {
            toast.error('حدث خطأ')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return
        try {
            await deleteDepartment(id)
            toast.success('تم حذف القسم')
            loadData()
        } catch {
            toast.error('لا يمكن حذف هذا القسم')
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-3" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Building2 className="h-5.5 w-5.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">الأقسام والإدارات</h1>
                        <p className="page-subtitle">{departments.length} قسم مسجل في النظام</p>
                    </div>
                </div>
                {can('auth.departments.create') && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" />
                        إضافة قسم
                    </button>
                )}
            </div>

            {/* Departments list */}
            <div className="edara-card overflow-hidden">
                {departments.length === 0 ? (
                    <div className="edara-empty m-5 flex flex-col items-center gap-3 py-16">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                            <Building2 className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>لا توجد أقسام مسجلة</p>
                        {can('auth.departments.create') && (
                            <button onClick={openCreate} className="btn btn-primary btn-sm mt-2">
                                <Plus className="h-3.5 w-3.5" />
                                إضافة أول قسم
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                    <tr className="edara-thead">
                                        <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>القسم</th>
                                        <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>المدير</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الموظفين</th>
                                        <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                                        <th className="px-5 py-3 text-end text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>إجراءات</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {departments.map((dept, i) => (
                                    <tr
                                        key={dept.id}
                                        className="edara-tr-hover transition-colors"
                                        style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30">
                                                    <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                                </div>
                                                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{dept.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <UsersIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {dept.manager?.full_name || 'غير محدد'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full text-xs font-bold px-2"
                                                style={{
                                                    backgroundColor: (employeeCounts[dept.id] || 0) > 0 ? 'var(--color-primary-50)' : 'var(--empty-bg)',
                                                    color: (employeeCounts[dept.id] || 0) > 0 ? 'var(--color-primary-600)' : 'var(--text-muted)',
                                                }}>
                                                {employeeCounts[dept.id] || 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`badge ${dept.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                {dept.is_active ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-end">
                                            <div className="flex items-center justify-end gap-1">
                                                {can('auth.departments.update') && (
                                                    <button onClick={() => openEdit(dept)} className="btn-ghost p-2 rounded-lg" title="تعديل">
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {can('auth.departments.delete') && (
                                                    <button onClick={() => handleDelete(dept.id)} className="btn-ghost p-2 rounded-lg hover:!text-danger" title="حذف">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="edara-overlay fixed inset-0" onClick={() => setShowModal(false)} />
                    <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl shadow-modal" style={{ backgroundColor: 'var(--card-bg)' }}>
                        {/* Modal header */}
                        <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-lg font-bold">{editDept ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
                                </div>
                                <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم القسم *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="form-input"
                                    required
                                    placeholder="مثال: قسم المبيعات"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>القسم الأب</label>
                                <select
                                    value={form.parent_id}
                                    onChange={(e) => setForm(f => ({ ...f, parent_id: e.target.value }))}
                                    className="form-input"
                                >
                                    <option value="">بدون قسم أب</option>
                                    {departments.filter(d => d.id !== editDept?.id).map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>مدير القسم</label>
                                <select
                                    value={form.manager_id}
                                    onChange={(e) => setForm(f => ({ ...f, manager_id: e.target.value }))}
                                    className="form-input"
                                >
                                    <option value="">غير محدد</option>
                                    {profiles.filter(p => p.is_active).map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--divider-color)' }}>
                                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {editDept ? 'حفظ التعديل' : 'إنشاء القسم'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
