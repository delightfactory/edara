import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { UserCircle2, Plus, Search, Filter, Download, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCompanySettings } from '@/lib/services/settings'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartmentLookups } from '@/lib/services/hr'
import { getProfileLookups } from '@/lib/services/inventory'
import type { EmployeeWithRefs, EmployeeInput, EmployeeFilters, SalesRepInput, DepartmentLookup } from '@/lib/types/hr'
import type { ProfileLookup } from '@/lib/types/inventory'
import { EmployeesTable } from '@/components/modules/hr/EmployeesTable'
import { EmployeeFormDialog } from '@/components/modules/hr/EmployeeFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { exportToCSV } from '@/lib/utils/exportCSV'
import { toast } from 'sonner'

export function EmployeesPage() {
    usePageTitle('الموظفين والمناديب')
    const { can } = useAuthStore()
    const navigate = useNavigate()

    // Lookups
    const [profiles, setProfiles] = useState<ProfileLookup[]>([])
    const [departments, setDepartments] = useState<DepartmentLookup[]>([])

    // Data
    const [employees, setEmployees] = useState<EmployeeWithRefs[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    // Filters
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterDepartment, setFilterDepartment] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<EmployeeWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onEscape: () => { if (showForm) setShowForm(false); else if (confirmId) setConfirmId(null) },
        onSearch: () => searchRef.current?.focus(),
    })

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })

        Promise.all([
            getProfileLookups(),
            getDepartmentLookups(),
        ]).then(([p, d]) => {
            setProfiles(p)
            setDepartments(d)
        }).catch(() => { })
    }, [])

    const loadEmployees = useCallback(async () => {
        setLoading(true)
        try {
            const filters: EmployeeFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                department_id: filterDepartment || undefined,
            }
            const result = await getEmployees(filters)
            setEmployees(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل الموظفين')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterDepartment])

    useEffect(() => { loadEmployees() }, [loadEmployees])

    // Handle edit from detail page
    const location = useLocation()
    useEffect(() => {
        const editId = (location.state as { editId?: string } | null)?.editId
        if (editId && employees.length > 0) {
            const employee = employees.find(e => e.id === editId)
            if (employee) {
                setEditing(employee)
                setShowForm(true)
            }
            window.history.replaceState({}, '')
        }
    }, [location.state, employees])

    const handleSave = async (data: Partial<EmployeeInput>, repData: Partial<SalesRepInput> | null, isEdit: boolean) => {
        if (!data.profile_id) { toast.error('يرجى اختيار المستخدم'); return }
        setSaving(true)
        try {
            if (isEdit && editing) {
                await updateEmployee(editing.id, data, repData)
                toast.success('تم تحديث بيانات الموظف')
            } else {
                await createEmployee(data, repData || undefined)
                toast.success('تم إنشاء الموظف بنجاح')
            }
            setShowForm(false)
            loadEmployees()
        } catch {
            toast.error(isEdit ? 'فشل تحديث الموظف' : 'فشل إنشاء الموظف')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setDeleting(id)
        setConfirmId(null)
        try {
            await deleteEmployee(id)
            toast.success('تم حذف الموظف')
            loadEmployees()
        } catch {
            toast.error('فشل الحذف — قد يكون مرتبطاً بمستودع أو عميل')
        } finally {
            setDeleting(null)
        }
    }

    const openCreate = () => { setEditing(null); setShowForm(true) }
    const openEdit = (e: EmployeeWithRefs) => { setEditing(e); setShowForm(true) }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <UserCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">الموظفين والمناديب</h1>
                        <p className="page-subtitle">{total} موظف في النظام</p>
                    </div>
                </div>
                {can('hr.employees.create') && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportToCSV(employees.map(e => ({
                            name: e.profile?.full_name || '—',
                            employee_code: e.employee_code || '—',
                            job_title: e.job_title || '—',
                            department: e.department?.name || '—',
                            salary: e.salary,
                        })), [
                            { key: 'name', label: 'الاسم' },
                            { key: 'employee_code', label: 'الكود' },
                            { key: 'job_title', label: 'المسمى' },
                            { key: 'department', label: 'القسم' },
                            { key: 'salary', label: 'الراتب' },
                        ], 'الموظفين')} className="btn btn-secondary" title="تصدير CSV">
                            <Download className="h-4 w-4" />
                        </button>
                        <button onClick={openCreate} className="btn btn-primary">
                            <Plus className="h-4 w-4" /> إضافة موظف
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث بالاسم أو الكود أو المسمى..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterDepartment} onChange={e => { setFilterDepartment(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الأقسام</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    {(search || filterDepartment) && (
                        <button onClick={() => { setSearch(''); setFilterDepartment(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح الفلاتر
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <EmployeesTable
                employees={employees} loading={loading}
                page={page} totalPages={totalPages} total={total}
                canUpdate={can('hr.employees.update')}
                canDelete={can('hr.employees.update')}
                canCreate={can('hr.employees.create')}
                deleting={deleting} search={search}
                hasFilters={!!filterDepartment}
                onEdit={openEdit} onDelete={id => setConfirmId(id)}
                onPageChange={setPage} onCreateFirst={openCreate}
                onRowClick={id => navigate(`/hr/employees/${id}`)}
            />

            {/* Confirm Delete */}
            <ConfirmDialog
                open={!!confirmId}
                title="حذف الموظف"
                message="هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting}
                onConfirm={() => confirmId && handleDelete(confirmId)}
                onCancel={() => setConfirmId(null)}
            />

            {/* Form Dialog */}
            <EmployeeFormDialog
                open={showForm} employee={editing}
                profiles={profiles} departments={departments}
                saving={saving}
                onClose={() => setShowForm(false)} onSave={handleSave}
            />
        </div>
    )
}
