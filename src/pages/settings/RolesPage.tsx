import { useState, useEffect } from 'react'
import {
    Shield, Plus, Pencil, Trash2, ChevronDown, ChevronLeft,
    Loader2, X, Check, KeyRound, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getRoles, createRole, updateRole, deleteRole,
    getPermissions, getRolePermissions, setRolePermissions
} from '@/lib/services/auth'
import type { Role, Permission } from '@/lib/types/database'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

// Group permissions by module
function groupPermissionsByModule(permissions: Permission[]) {
    const groups: Record<string, { module: string; entities: Record<string, Permission[]> }> = {}

    for (const p of permissions) {
        if (!groups[p.module]) {
            groups[p.module] = { module: p.module, entities: {} }
        }
        const group = groups[p.module]!
        if (!group.entities[p.entity]) {
            group.entities[p.entity] = []
        }
        group.entities[p.entity]!.push(p)
    }

    return groups
}

const MODULE_LABELS: Record<string, string> = {
    auth: 'المصادقة والصلاحيات',
    products: 'المنتجات',
    inventory: 'المخازن',
    crm: 'العملاء (CRM)',
    sales: 'المبيعات',
    purchases: 'المشتريات',
    finance: 'المالية',
    reps: 'المندوبين',
    targets: 'الأهداف',
    commissions: 'العمولات',
    hr: 'الموارد البشرية',
    reports: 'التقارير',
    settings: 'الإعدادات',
}

export function RolesPage() {
    const { can } = useAuthStore()
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [selectedRolePerms, setSelectedRolePerms] = useState<string[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [isSavingPerms, setIsSavingPerms] = useState(false)

    const loadData = async () => {
        try {
            setIsLoading(true)
            const [rolesData, permsData] = await Promise.all([getRoles(), getPermissions()])
            setRoles(rolesData)
            setPermissions(permsData)
        } catch {
            toast.error('حدث خطأ في تحميل البيانات')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const handleSelectRole = async (role: Role) => {
        setSelectedRole(role)
        try {
            const permIds = await getRolePermissions(role.id)
            setSelectedRolePerms(permIds)
        } catch {
            toast.error('حدث خطأ في تحميل صلاحيات الدور')
        }
    }

    const handleTogglePermission = (permissionId: string) => {
        setSelectedRolePerms((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        )
    }

    const handleToggleModule = (modulePerms: Permission[]) => {
        const modulePermIds = modulePerms.map((p) => p.id)
        const allSelected = modulePermIds.every((id) => selectedRolePerms.includes(id))

        if (allSelected) {
            setSelectedRolePerms((prev) => prev.filter((id) => !modulePermIds.includes(id)))
        } else {
            setSelectedRolePerms((prev) => [...new Set([...prev, ...modulePermIds])])
        }
    }

    const handleSavePermissions = async () => {
        if (!selectedRole) return
        setIsSavingPerms(true)
        try {
            await setRolePermissions(selectedRole.id, selectedRolePerms)
            toast.success('تم حفظ الصلاحيات بنجاح')
        } catch {
            toast.error('حدث خطأ في حفظ الصلاحيات')
        } finally {
            setIsSavingPerms(false)
        }
    }

    const handleDeleteRole = async (role: Role) => {
        if (role.is_system) {
            toast.error('لا يمكن حذف دور نظامي')
            return
        }
        if (!confirm(`هل أنت متأكد من حذف الدور "${role.display_name}"؟`)) return
        try {
            await deleteRole(role.id)
            toast.success('تم حذف الدور')
            if (selectedRole?.id === role.id) {
                setSelectedRole(null)
                setSelectedRolePerms([])
            }
            loadData()
        } catch {
            toast.error('حدث خطأ في حذف الدور')
        }
    }

    const permGroups = groupPermissionsByModule(permissions)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-3" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
                <p className="text-sm text-surface-400">جاري تحميل الأدوار...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">إدارة الأدوار والصلاحيات</h1>
                        <p className="page-subtitle">
                            {roles.length} دور مسجّل في النظام
                        </p>
                    </div>
                </div>
                {can('auth.roles.create') && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        إضافة دور
                    </button>
                )}
            </div>

            {/* Two-panel layout — stacked on mobile */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[300px_1fr]">
                {/* Roles List */}
                <div className="edara-card overflow-hidden">
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--divider-color)', backgroundColor: 'var(--table-header-bg)' }}>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                            الأدوار ({roles.length})
                        </h2>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--divider-color)' }}>
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className={cn(
                                    'flex items-center justify-between px-5 py-3.5 cursor-pointer transition-all duration-200',
                                    selectedRole?.id === role.id
                                        ? 'border-r-3 border-r-primary-500'
                                        : ''
                                )}
                                onClick={() => handleSelectRole(role)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                                        selectedRole?.id === role.id
                                            ? 'bg-primary-100 dark:bg-primary-900/30'
                                            : 'bg-surface-100 dark:bg-surface-800'
                                    )}>
                                        <Shield className={cn(
                                            'h-4 w-4',
                                            selectedRole?.id === role.id
                                                ? 'text-primary-600 dark:text-primary-400'
                                                : 'text-surface-400'
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {role.display_name}
                                        </p>
                                        {role.is_system && (
                                            <span className="badge badge-primary text-[10px]">
                                                <Lock className="h-2.5 w-2.5" />
                                                نظامي
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!role.is_system && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingRole(role) }}
                                                className="btn-ghost btn-icon rounded-lg opacity-0 group-hover:opacity-100 sm:opacity-100"
                                                title="تعديل"
                                            >
                                                <Pencil className="h-3.5 w-3.5 text-surface-400 hover:text-primary-600" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(role) }}
                                                className="btn-ghost btn-icon rounded-lg"
                                                title="حذف"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-surface-400 hover:text-danger" />
                                            </button>
                                        </>
                                    )}
                                    <ChevronLeft className="h-4 w-4 text-surface-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Permissions Panel */}
                <div className="edara-card overflow-hidden">
                    {selectedRole ? (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--divider-color)', backgroundColor: 'var(--table-header-bg)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                        <KeyRound className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                            صلاحيات: {selectedRole.display_name}
                                        </h2>
                                        <p className="text-[11px] text-surface-400">
                                            {selectedRolePerms.length} صلاحية مُحددة
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={isSavingPerms || selectedRole.name === 'super_admin'}
                                    className="btn btn-primary btn-sm"
                                >
                                    {isSavingPerms ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    حفظ الصلاحيات
                                </button>
                            </div>

                            {selectedRole.name === 'super_admin' ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/30">
                                        <Shield className="h-6 w-6 text-primary-500" />
                                    </div>
                                    <p className="text-sm text-surface-500">مدير النظام لديه كل الصلاحيات تلقائياً</p>
                                </div>
                            ) : (
                                <div className="divide-y px-3 sm:px-5 max-h-[50vh] sm:max-h-[600px] overflow-y-auto" style={{ borderColor: 'var(--divider-color)' }}>
                                    {Object.entries(permGroups).map(([moduleKey, group]) => {
                                        const modulePerms = Object.values(group.entities).flat()
                                        const allSelected = modulePerms.every((p) => selectedRolePerms.includes(p.id))
                                        const someSelected = modulePerms.some((p) => selectedRolePerms.includes(p.id))

                                        return (
                                            <ModuleSection
                                                key={moduleKey}
                                                label={MODULE_LABELS[moduleKey] || moduleKey}
                                                allSelected={allSelected}
                                                someSelected={someSelected}
                                                onToggleAll={() => handleToggleModule(modulePerms)}
                                            >
                                                {Object.entries(group.entities).map(([, entityPerms]) =>
                                                    entityPerms.map((perm) => {
                                                        const isOn = selectedRolePerms.includes(perm.id)
                                                        return (
                                                            <div
                                                                key={perm.id}
                                                                className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors"
                                                                style={{ backgroundColor: isOn ? 'rgba(16,185,129,0.04)' : 'transparent' }}
                                                                onClick={() => handleTogglePermission(perm.id)}
                                                            >
                                                                <span className="text-sm" style={{ color: isOn ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                                    {perm.display_name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className={`relative h-6 w-10 rounded-full transition-colors shrink-0 ${isOn ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'}`}
                                                                    onClick={(e) => { e.stopPropagation(); handleTogglePermission(perm.id) }}
                                                                >
                                                                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isOn ? 'left-0.5' : 'left-[calc(100%-1.375rem)]'}`} />
                                                                </button>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </ModuleSection>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
                                <Shield className="h-6 w-6 text-surface-400" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-surface-500">اختر دوراً لعرض صلاحياته</p>
                                <p className="text-xs text-surface-400 mt-1">انقر على أي دور من القائمة</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Role Modal */}
            {showCreateModal && (
                <RoleModal
                    onClose={() => setShowCreateModal(false)}
                    onSaved={() => { setShowCreateModal(false); loadData() }}
                />
            )}

            {/* Edit Role Modal */}
            {editingRole && (
                <RoleModal
                    role={editingRole}
                    onClose={() => setEditingRole(null)}
                    onSaved={() => { setEditingRole(null); loadData() }}
                />
            )}
        </div>
    )
}

// ============================================================
// Sub-Components
// ============================================================

function ModuleSection({
    label,
    allSelected,
    someSelected,
    onToggleAll,
    children,
}: {
    label: string
    allSelected: boolean
    someSelected: boolean
    onToggleAll: () => void
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <div className="py-3">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 font-semibold text-sm transition-colors" style={{ color: 'var(--text-primary)' }}
                >
                    <ChevronDown className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        open && 'rotate-180'
                    )} />
                    {label}
                    {someSelected && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-1.5">
                            {/* count would go here */}
                        </span>
                    )}
                </button>
                <button
                    onClick={onToggleAll}
                    className={cn(
                        'btn btn-sm rounded-lg text-xs font-medium',
                        allSelected
                            ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400'
                            : someSelected
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/15 dark:text-amber-400'
                                : 'bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400'
                    )}
                >
                    {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
            </div>
            {open && (
                <div className="mr-4 mt-2 space-y-0.5 animate-[fade-in_0.2s_ease-out]">
                    {children}
                </div>
            )}
        </div>
    )
}

function RoleModal({
    role,
    onClose,
    onSaved,
}: {
    role?: Role
    onClose: () => void
    onSaved: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState({
        name: role?.name || '',
        display_name: role?.display_name || '',
        description: role?.description || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            if (role) {
                await updateRole(role.id, form)
                toast.success('تم تحديث الدور')
            } else {
                await createRole(form)
                toast.success('تم إنشاء الدور')
            }
            onSaved()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'حدث خطأ')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 edara-overlay animate-[fade-in_0.15s_ease-out]"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl p-0 shadow-modal animate-[scale-in_0.2s_ease-out] overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">
                                    {role ? 'تعديل الدور' : 'إضافة دور جديد'}
                                </h2>
                                <p className="text-xs text-primary-200 mt-0.5">
                                    {role ? 'تعديل بيانات الدور' : 'أدخل بيانات الدور الجديد'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            الاسم البرمجي <span className="text-danger text-xs">*</span>
                        </label>
                        <input
                            type="text" required value={form.name} dir="ltr"
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="form-input" placeholder="e.g. branch_manager"
                            disabled={!!role}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            الاسم المعروض <span className="text-danger text-xs">*</span>
                        </label>
                        <input
                            type="text" required value={form.display_name}
                            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                            className="form-input" placeholder="مثال: مدير الفرع"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>الوصف</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="form-input min-h-[80px] resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                        <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {role ? 'حفظ التغييرات' : 'إنشاء الدور'}
                        </button>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
