import { useState } from 'react'
import { User, Lock, Save, Loader2, Mail, Phone } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { ImageUploadField } from '@/components/ui/ImageUploadField'

export function ProfilePage() {
    usePageTitle('الملف الشخصي')
    const { profile, user, setProfile } = useAuthStore()

    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [phone, setPhone] = useState(profile?.phone || '')
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
    const [savingProfile, setSavingProfile] = useState(false)

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [savingPassword, setSavingPassword] = useState(false)

    const handleSaveProfile = async () => {
        setSavingProfile(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName, phone: phone || null, avatar_url: avatarUrl })
                .eq('id', profile?.id)
            if (error) throw error
            setProfile({ ...profile!, full_name: fullName, phone, avatar_url: avatarUrl })
            toast.success('تم تحديث البيانات الشخصية')
        } catch {
            toast.error('فشل تحديث البيانات')
        } finally {
            setSavingProfile(false)
        }
    }

    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('كلمة المرور الجديدة غير متطابقة')
            return
        }
        setSavingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            })
            if (error) throw error
            setNewPassword('')
            setConfirmPassword('')
            toast.success('تم تغيير كلمة المرور بنجاح')
        } catch {
            toast.error('فشل تغيير كلمة المرور')
        } finally {
            setSavingPassword(false)
        }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">الملف الشخصي</h1>
                    <p className="page-subtitle">تعديل بياناتك الشخصية وكلمة المرور</p>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Profile Info */}
                <div className="edara-card p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>البيانات الشخصية</h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
                        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ backgroundColor: 'var(--empty-bg)' }}>
                            <Mail className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <span className="text-sm" dir="ltr" style={{ color: 'var(--text-muted)' }}>{user?.email || '—'}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الاسم الكامل</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                            className="form-input" placeholder="أدخل اسمك" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>رقم الهاتف</label>
                        <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                className="form-input" dir="ltr" style={{ paddingInlineStart: '2.5rem' }} placeholder="05XXXXXXXX" />
                        </div>
                    </div>

                    <ImageUploadField
                        value={avatarUrl}
                        onChange={(url) => setAvatarUrl(url)}
                        bucket="user-avatars"
                        folder={profile?.id || 'unknown'}
                        label="الصورة الشخصية"
                    />

                    <button onClick={handleSaveProfile} disabled={savingProfile || !fullName.trim()}
                        className="btn btn-primary w-full">
                        {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ التغييرات
                    </button>
                </div>

                {/* Password Change */}
                <div className="edara-card p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>تغيير كلمة المرور</h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>كلمة المرور الجديدة</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="form-input" dir="ltr" placeholder="••••••••" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>تأكيد كلمة المرور</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            className="form-input" dir="ltr" placeholder="••••••••" />
                    </div>

                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500">كلمة المرور غير متطابقة</p>
                    )}

                    <button onClick={handleChangePassword}
                        disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                        className="btn btn-primary w-full">
                        {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        تغيير كلمة المرور
                    </button>
                </div>
            </div>
        </div>
    )
}
