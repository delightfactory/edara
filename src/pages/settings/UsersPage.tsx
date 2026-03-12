import { useState, useEffect } from 'react'
import {
    Users, Plus, Search, Shield,
    UserPlus, Pencil, ToggleLeft, ToggleRight, Loader2, X,
    Mail, Phone, KeyRound, User, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getProfiles, getRoles, getUserRoles, assignRole,
    removeUserRole, createUser, adminUpdateUser
} from '@/lib/services/auth'
import type { Profile, Role } from '@/lib/types/database'
import { useAuthStore } from '@/stores/auth-store'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function UsersPage() {
    usePageTitle('المستخدمين')
    const { can } = useAuthStore()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [showRoleModal, setShowRoleModal] = useState<string | null>(null)
    const [userRolesMap, setUserRolesMap] = useState<Record<string, { id: string; role: Role }[]>>({})

    const loadData = async () => {
        try {
            setIsLoading(true)
            const [profilesData, rolesData] = await Promise.all([
                getProfiles({ search: search || undefined }),
                getRoles(),
            ])
            setProfiles(profilesData)
            setRoles(rolesData)

            // Load roles for each user
            const rolesMap: Record<string, { id: string; role: Role }[]> = {}
            for (const profile of profilesData) {
                try {
                    const userRoles = await getUserRoles(profile.id)
                    rolesMap[profile.id] = userRoles.map((ur) => ({
                        id: ur.id,
                        role: ur.roles as unknown as Role,
                    }))
                } catch {
                    rolesMap[profile.id] = []
                }
            }
            setUserRolesMap(rolesMap)
        } catch (error) {
            toast.error('حدث خطأ في تحميل البيانات')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSearch = () => {
        loadData()
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                            <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h1 className="page-title">إدارة المستخدمين</h1>
                            <p className="page-subtitle">
                                {profiles.length} مستخدم مسجّل
                            </p>
                        </div>
                    </div>
                </div>
                {can('auth.users.create') && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        <UserPlus className="h-4 w-4" />
                        إضافة مستخدم
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                    type="text"
                    placeholder="بحث بالاسم أو الهاتف..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="form-input pr-10 pl-4"
                />
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="relative">
                        <div className="h-10 w-10 animate-spin rounded-full border-3" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
                    </div>
                    <p className="text-sm text-surface-400">جاري تحميل المستخدمين...</p>
                </div>
            ) : (
                <div className="edara-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="edara-thead" style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                    <th className="px-4 sm:px-6 py-3.5 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>المستخدم</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الهاتف</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الأدوار</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-end text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody style={{ borderColor: 'var(--divider-color)' }} className="divide-y">
                                {profiles.map((profile, index) => (
                                    <UserRow
                                        key={profile.id}
                                        profile={profile}
                                        roles={roles}
                                        userRoles={userRolesMap[profile.id] || []}
                                        index={index}
                                        onEdit={() => setEditingUser(profile)}
                                        onManageRoles={() => setShowRoleModal(profile.id)}
                                        onToggleActive={async () => {
                                            try {
                                                await adminUpdateUser(profile.id, { is_active: !profile.is_active })
                                                toast.success(profile.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب')
                                                loadData()
                                            } catch {
                                                toast.error('حدث خطأ')
                                            }
                                        }}
                                    />
                                ))}
                                {profiles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
                                                    <Users className="h-6 w-6 text-surface-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-surface-500">لا يوجد مستخدمين</p>
                                                    <p className="text-xs text-surface-400 mt-1">ابدأ بإضافة مستخدم جديد للنظام</p>
                                                </div>
                                                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm mt-2">
                                                    <UserPlus className="h-3.5 w-3.5" />
                                                    إضافة مستخدم
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showCreateModal && (
                <CreateUserModal
                    roles={roles}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); loadData() }}
                />
            )}

            {editingUser && (
                <EditUserModal
                    profile={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUpdated={() => { setEditingUser(null); loadData() }}
                />
            )}

            {showRoleModal && (
                <RoleAssignmentModal
                    userId={showRoleModal}
                    roles={roles}
                    currentRoles={userRolesMap[showRoleModal] || []}
                    onClose={() => setShowRoleModal(null)}
                    onUpdated={() => { setShowRoleModal(null); loadData() }}
                />
            )}
        </div>
    )
}

// ============================================================
// Sub-Components
// ============================================================

function UserRow({
    profile,
    userRoles,
    index,
    onEdit,
    onManageRoles,
    onToggleActive,
}: {
    profile: Profile
    roles: Role[]
    userRoles: { id: string; role: Role }[]
    index: number
    onEdit: () => void
    onManageRoles: () => void
    onToggleActive: () => void
}) {
    const { can } = useAuthStore()
    return (
        <tr
            className="group edara-tr-hover transition-colors"
            style={{ animationDelay: `${index * 40}ms`, animation: 'fade-in 0.3s ease-out backwards' }}
        >
            <td className="px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-bold text-white shadow-sm">
                        {profile.full_name?.[0] || '?'}
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.full_name || 'بدون اسم'}</p>
                        <p className="text-[11px] text-surface-400 mt-0.5">
                            {profile.id.substring(0, 8)}...
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 sm:px-6 py-4 ltr text-sm" style={{ color: 'var(--text-secondary)' }}>
                {profile.phone || (
                    <span className="text-surface-300">—</span>
                )}
            </td>
            <td className="px-4 sm:px-6 py-4">
                <div className="flex flex-wrap gap-1.5">
                    {userRoles.length > 0 ? (
                        userRoles.map((ur) => (
                            <span
                                key={ur.id}
                                className="badge badge-primary"
                            >
                                {ur.role.display_name}
                            </span>
                        ))
                    ) : (
                        <span className="badge" style={{ background: 'var(--color-surface-100)', color: 'var(--color-surface-400)', border: '1px solid var(--color-surface-200)' }}>
                            بدون دور
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 sm:px-6 py-4">
                <span className={cn(
                    'badge',
                    profile.is_active ? 'badge-success' : 'badge-danger'
                )}>
                    <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        profile.is_active ? 'bg-success' : 'bg-danger'
                    )} />
                    {profile.is_active ? 'نشط' : 'معطّل'}
                </span>
            </td>
            <td className="px-4 sm:px-6 py-4">
                <div className="flex items-center gap-1">
                    {can('auth.users.update') && (
                        <button
                            onClick={onEdit}
                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            title="تعديل البيانات"
                        >
                            <Pencil className="h-3.5 w-3.5 text-surface-400 hover:text-primary-600" />
                        </button>
                    )}
                    {can('auth.roles.update') && (
                        <button
                            onClick={onManageRoles}
                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            title="إدارة الأدوار"
                        >
                            <Shield className="h-3.5 w-3.5 text-surface-400 hover:text-primary-600" />
                        </button>
                    )}
                    {can('auth.users.update') && (
                        <button
                            onClick={onToggleActive}
                            className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                profile.is_active
                                    ? 'hover:bg-danger/10'
                                    : 'hover:bg-success/10'
                            )}
                            title={profile.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                            {profile.is_active ? (
                                <ToggleLeft className="h-4 w-4 text-surface-400 hover:text-danger" />
                            ) : (
                                <ToggleRight className="h-4 w-4 text-surface-400 hover:text-success" />
                            )}
                        </button>
                    )}
                </div>
            </td>
        </tr>
    )
}

function CreateUserModal({
    roles,
    onClose,
    onCreated,
}: {
    roles: Role[]
    onClose: () => void
    onCreated: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role_id: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await createUser(form)
            toast.success('تم إنشاء المستخدم بنجاح')
            onCreated()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'حدث خطأ في إنشاء المستخدم')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <ModalOverlay onClose={onClose}>
            <div className="relative w-full max-w-lg rounded-2xl p-0 shadow-modal animate-[scale-in_0.2s_ease-out] overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
                {/* Header with gradient */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">إضافة مستخدم جديد</h2>
                                <p className="text-xs text-primary-200 mt-0.5">أدخل بيانات المستخدم الجديد</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormField label="الاسم الكامل" icon={User} required>
                        <input
                            type="text" required value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            className="form-input" placeholder="أدخل الاسم الكامل"
                        />
                    </FormField>
                    <FormField label="البريد الإلكتروني" icon={Mail} required>
                        <input
                            type="email" required value={form.email} dir="ltr"
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="form-input" placeholder="user@example.com"
                        />
                    </FormField>
                    <FormField label="كلمة المرور" icon={KeyRound} required>
                        <input
                            type="password" required minLength={6} value={form.password} dir="ltr"
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="form-input" placeholder="6 أحرف على الأقل"
                        />
                    </FormField>
                    <FormField label="الهاتف" icon={Phone}>
                        <input
                            type="tel" value={form.phone} dir="ltr"
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="form-input" placeholder="01xxxxxxxxx"
                        />
                    </FormField>
                    <FormField label="الدور" icon={Shield}>
                        <div className="relative">
                            <select
                                value={form.role_id}
                                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                                className="form-input appearance-none cursor-pointer"
                            >
                                <option value="">بدون دور</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>{r.display_name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                        </div>
                    </FormField>

                    <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                        <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            إنشاء المستخدم
                        </button>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    )
}

function EditUserModal({
    profile,
    onClose,
    onUpdated,
}: {
    profile: Profile
    onClose: () => void
    onUpdated: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        password: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const updates: Record<string, string> = {
                full_name: form.full_name,
                phone: form.phone,
            }
            if (form.password) updates.password = form.password

            await adminUpdateUser(profile.id, updates)
            toast.success('تم تحديث بيانات المستخدم')
            onUpdated()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'حدث خطأ')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <ModalOverlay onClose={onClose}>
            <div className="relative w-full max-w-lg rounded-2xl p-0 shadow-modal animate-[scale-in_0.2s_ease-out] overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
                {/* Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <Pencil className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">تعديل: {profile.full_name}</h2>
                                <p className="text-xs text-primary-200 mt-0.5">تعديل بيانات المستخدم</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormField label="الاسم الكامل" icon={User} required>
                        <input
                            type="text" required value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            className="form-input"
                        />
                    </FormField>
                    <FormField label="الهاتف" icon={Phone}>
                        <input
                            type="tel" value={form.phone} dir="ltr"
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="form-input"
                        />
                    </FormField>
                    <FormField label="كلمة مرور جديدة (اختياري)" icon={KeyRound}>
                        <input
                            type="password" minLength={6} value={form.password} dir="ltr"
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="form-input" placeholder="اتركها فارغة لعدم التغيير"
                        />
                    </FormField>

                    <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--divider-color)' }}>
                        <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                            حفظ التغييرات
                        </button>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    )
}

function RoleAssignmentModal({
    userId,
    roles,
    currentRoles,
    onClose,
    onUpdated,
}: {
    userId: string
    roles: Role[]
    currentRoles: { id: string; role: Role }[]
    onClose: () => void
    onUpdated: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const currentRoleIds = currentRoles.map((cr) => cr.role.id)

    const handleToggleRole = async (roleId: string) => {
        setIsSubmitting(true)
        try {
            if (currentRoleIds.includes(roleId)) {
                const userRole = currentRoles.find((cr) => cr.role.id === roleId)
                if (userRole) {
                    await removeUserRole(userRole.id)
                    toast.success('تم إزالة الدور')
                }
            } else {
                await assignRole(userId, roleId)
                toast.success('تم تعيين الدور')
            }
            onUpdated()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'حدث خطأ')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <ModalOverlay onClose={onClose}>
            <div className="relative w-full max-w-md rounded-2xl p-0 shadow-modal animate-[scale-in_0.2s_ease-out] overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
                {/* Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">إدارة الأدوار</h2>
                                <p className="text-xs text-primary-200 mt-0.5">اختر الأدوار المناسبة للمستخدم</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {roles.map((role) => {
                        const isAssigned = currentRoleIds.includes(role.id)
                        return (
                            <button
                                key={role.id}
                                onClick={() => handleToggleRole(role.id)}
                                disabled={isSubmitting}
                                className={cn(
                                    'flex w-full items-center justify-between rounded-xl border p-4 text-right transition-all duration-200',
                                    isAssigned
                                        ? 'border-primary-300 bg-primary-50/70 shadow-sm dark:border-primary-700 dark:bg-primary-900/20'
                                        : 'border-surface-200 hover:border-primary-200 hover:bg-primary-50/30 dark:border-surface-700 dark:hover:border-surface-600'
                                )}
                            >
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{role.display_name}</p>
                                    {role.description && (
                                        <p className="mt-0.5 text-xs text-surface-500">{role.description}</p>
                                    )}
                                </div>
                                <div className={cn(
                                    'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200',
                                    isAssigned
                                        ? 'border-primary-600 bg-primary-600 shadow-sm shadow-primary-600/30'
                                        : 'border-surface-300 dark:border-surface-600'
                                )}>
                                    {isAssigned && (
                                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="p-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary w-full">
                        إغلاق
                    </button>
                </div>
            </div>
        </ModalOverlay>
    )
}

// ============================================================
// Shared Components
// ============================================================

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 edara-overlay animate-[fade-in_0.15s_ease-out]"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-lg">{children}</div>
        </div>
    )
}

function FormField({
    label,
    required,
    icon: Icon,
    children,
}: {
    label: string
    required?: boolean
    icon?: React.ComponentType<{ className?: string }>
    children: React.ReactNode
}) {
    return (
        <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {Icon && <Icon className="h-3.5 w-3.5 text-surface-400" />}
                {label}
                {required && <span className="text-danger text-xs">*</span>}
            </label>
            {children}
        </div>
    )
}
