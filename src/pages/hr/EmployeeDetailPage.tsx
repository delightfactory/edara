import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Users, ArrowRight, Loader2, Pencil,
    Briefcase, MapPin, Car, Target, Clock,
    Phone, HandshakeIcon, Building2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getEmployee, updateEmployee, getDepartmentLookups, getAssignedCustomersForRep } from '@/lib/services/hr'
import { getProfileLookups } from '@/lib/services/inventory'
import type { EmployeeWithRefs, EmployeeInput, SalesRepInput, DepartmentLookup } from '@/lib/types/hr'
import { REP_TYPE_LABELS, REP_TYPE_BADGES } from '@/lib/types/hr'
import type { RepType } from '@/lib/types/hr'
import type { ProfileLookup } from '@/lib/types/inventory'
import type { AssignedCustomerSummary } from '@/lib/services/hr'
import { EmployeeFormDialog } from '@/components/modules/hr/EmployeeFormDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function EmployeeDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { can } = useAuthStore()
    usePageTitle('تفاصيل الموظف')

    const [employee, setEmployee] = useState<EmployeeWithRefs | null>(null)
    const [loading, setLoading] = useState(true)
    const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomerSummary[]>([])

    // Form dialog state
    const [showForm, setShowForm] = useState(false)
    const [formSaving, setFormSaving] = useState(false)
    const [profiles, setProfiles] = useState<ProfileLookup[]>([])
    const [departments, setDepartments] = useState<DepartmentLookup[]>([])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        getEmployee(id)
            .then(e => {
                setEmployee(e)
                // Load assigned customers if employee is a sales rep
                if (e?.sales_rep && e.profile_id) {
                    getAssignedCustomersForRep(e.profile_id)
                        .then(setAssignedCustomers)
                        .catch(() => {})
                }
            })
            .catch(() => toast.error('فشل تحميل بيانات الموظف'))
            .finally(() => setLoading(false))
    }, [id])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(val)

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const openEditDialog = () => {
        getProfileLookups().then(setProfiles).catch(() => {})
        getDepartmentLookups().then(setDepartments).catch(() => {})
        setShowForm(true)
    }

    const handleFormSave = async (data: Partial<EmployeeInput>, repData: Partial<SalesRepInput> | null, isEdit: boolean) => {
        if (!isEdit || !employee) return
        setFormSaving(true)
        try {
            await updateEmployee(employee.id, data, repData)
            toast.success('تم تحديث بيانات الموظف')
            setShowForm(false)
            const updated = await getEmployee(employee.id)
            setEmployee(updated)
            // Reload assigned customers
            if (updated?.sales_rep && updated.profile_id) {
                getAssignedCustomersForRep(updated.profile_id)
                    .then(setAssignedCustomers)
                    .catch(() => {})
            } else {
                setAssignedCustomers([])
            }
        } catch {
            toast.error('فشل تحديث الموظف')
        } finally {
            setFormSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary-600)' }} />
            </div>
        )
    }

    if (!employee) {
        return (
            <div className="text-center py-20 space-y-3">
                <Users className="h-12 w-12 mx-auto" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-muted)' }}>الموظف غير موجود</p>
                <button onClick={() => navigate('/hr/employees')} className="btn btn-secondary btn-sm">
                    <ArrowRight className="h-4 w-4" /> العودة للموظفين
                </button>
            </div>
        )
    }

    const rep = employee.sales_rep

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/hr/employees')}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30"
                        title="العودة للموظفين">
                        <ArrowRight className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="page-title">{employee.profile?.full_name || '—'}</h1>
                            {rep && (
                                <span className={cn('badge text-[10px]', REP_TYPE_BADGES[rep.rep_type as RepType])}>
                                    {REP_TYPE_LABELS[rep.rep_type as RepType]}
                                </span>
                            )}
                            <span className={cn('badge text-[10px]', employee.is_active ? 'badge-success' : 'badge-danger')}>
                                {employee.is_active ? 'نشط' : 'معطّل'}
                            </span>
                        </div>
                        <p className="page-subtitle">
                            {employee.employee_code || '—'}
                            {employee.department?.name && ` • ${employee.department.name}`}
                            {employee.job_title && ` • ${employee.job_title}`}
                        </p>
                    </div>
                </div>
                {can('hr.employees.update') && (
                    <button onClick={openEditDialog} className="btn btn-primary">
                        <Pencil className="h-4 w-4" /> تعديل
                    </button>
                )}
            </div>

            {/* Info Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Employment Info */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>بيانات التوظيف</h3>
                    </div>
                    <InfoRow label="كود الموظف" value={employee.employee_code} />
                    <InfoRow label="المسمى الوظيفي" value={employee.job_title} />
                    <InfoRow label="القسم" value={employee.department?.name} icon={<Building2 className="h-3.5 w-3.5" />} />
                    <InfoRow label="تاريخ التعيين" value={formatDate(employee.hire_date)} />
                    <InfoRow label="الراتب الأساسي" value={`${formatCurrency(employee.salary)} ج.م`} />
                    <InfoRow label="الحالة" value={employee.is_active ? 'نشط' : 'معطّل'}
                        valueColor={employee.is_active ? 'var(--color-success)' : 'var(--color-danger)'} />
                </div>

                {/* Sales Rep Info */}
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>بيانات المندوب</h3>
                    </div>
                    {rep ? (
                        <>
                            <InfoRow label="نوع المندوب" value={REP_TYPE_LABELS[rep.rep_type as RepType]} />
                            <InfoRow label="المنطقة" value={rep.territory} icon={<MapPin className="h-3.5 w-3.5" />} />
                            <InfoRow label="نوع المركبة" value={rep.vehicle_type} icon={<Car className="h-3.5 w-3.5" />} />
                            <InfoRow label="الحد الأقصى للعملاء" value={rep.max_customers.toString()} />
                            <InfoRow label="حالة المندوب" value={rep.is_active ? 'نشط' : 'معطّل'}
                                valueColor={rep.is_active ? 'var(--color-success)' : 'var(--color-danger)'} />
                        </>
                    ) : (
                        <div className="py-6 text-center">
                            <Target className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>هذا الموظف ليس مندوبًا</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Assigned Customers — Only for Sales Reps */}
            {rep && (
                <div className="edara-card p-5 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <HandshakeIcon className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>العملاء المسندين</h3>
                            <span className="badge badge-info text-[10px]">{assignedCustomers.length}</span>
                        </div>
                    </div>

                    {assignedCustomers.length === 0 ? (
                        <div className="py-6 text-center">
                            <HandshakeIcon className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>لا يوجد عملاء مسندين لهذا المندوب</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {assignedCustomers.map((c, i) => (
                                <div key={c.id}
                                    onClick={() => navigate(`/crm/customers/${c.id}`)}
                                    className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all hover:shadow-sm"
                                    style={{
                                        backgroundColor: 'var(--empty-bg)',
                                        animation: `fade-in 0.3s ease-out ${i * 40}ms backwards`,
                                    }}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30">
                                            <HandshakeIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {c.code && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.code}</span>}
                                                {c.phone && (
                                                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                                        <Phone className="h-3 w-3" /> {c.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn('badge text-[9px]', c.is_active ? 'badge-success' : 'badge-danger')}>
                                            {c.is_active ? 'نشط' : 'معطّل'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Timestamps */}
            <div className="edara-card p-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>تاريخ الإنشاء: {formatDate(employee.created_at)}</span>
                </div>
                {employee.updated_at && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>آخر تحديث: {formatDate(employee.updated_at)}</span>
                    </div>
                )}
            </div>

            <EmployeeFormDialog
                open={showForm} employee={employee}
                profiles={profiles} departments={departments}
                saving={formSaving}
                onClose={() => setShowForm(false)} onSave={handleFormSave}
            />
        </div>
    )
}

function InfoRow({ icon, label, value, dir, valueColor }: {
    icon?: React.ReactNode; label: string; value?: string | null; dir?: string; valueColor?: string
}) {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
                {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <span className="text-sm font-medium" dir={dir} style={{ color: valueColor || 'var(--text-primary)' }}>
                {value || '—'}
            </span>
        </div>
    )
}
