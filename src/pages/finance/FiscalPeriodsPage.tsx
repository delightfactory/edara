import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, X, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getFiscalPeriods, createFiscalPeriod, closeFiscalPeriod } from '@/lib/services/finance'
import type { FiscalPeriod, FiscalPeriodStatus } from '@/lib/types/finance'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

const STATUS_LABELS: Record<FiscalPeriodStatus, string> = { open: 'مفتوحة', closed: 'مغلقة' }
const STATUS_COLORS: Record<FiscalPeriodStatus, string> = { open: 'badge-success', closed: 'badge-secondary' }

export function FiscalPeriodsPage() {
    usePageTitle('الفترات المحاسبية')
    const { can } = useAuthStore()

    const [periods, setPeriods] = useState<FiscalPeriod[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [closeId, setCloseId] = useState<string | null>(null)

    const loadPeriods = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getFiscalPeriods()
            setPeriods(data)
        } catch {
            toast.error('حدث خطأ في تحميل الفترات')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadPeriods() }, [loadPeriods])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const data = {
            name: form.get('name') as string,
            start_date: form.get('start_date') as string,
            end_date: form.get('end_date') as string,
        }

        if (!data.name || !data.start_date || !data.end_date) {
            toast.error('يرجى ملء جميع الحقول')
            return
        }

        setSaving(true)
        try {
            await createFiscalPeriod(data)
            toast.success('تم إنشاء الفترة المحاسبية')
            setShowForm(false)
            loadPeriods()
        } catch {
            toast.error('فشل إنشاء الفترة')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">الفترات المحاسبية</h1>
                        <p className="page-subtitle">{periods.length} فترة</p>
                    </div>
                </div>
                {can('finance.settings.manage') && (
                    <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> فترة جديدة
                    </button>
                )}
            </div>

            <div className="edara-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>من</th>
                            <th>إلى</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="data-table-empty">جارٍ التحميل...</td></tr>
                        ) : periods.length === 0 ? (
                            <tr><td colSpan={5} className="data-table-empty">لا توجد فترات محاسبية</td></tr>
                        ) : periods.map(p => (
                            <tr key={p.id}>
                                <td >{p.name}</td>
                                <td >{new Date(p.start_date).toLocaleDateString('ar-EG')}</td>
                                <td >{new Date(p.end_date).toLocaleDateString('ar-EG')}</td>
                                <td><span className={`badge ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                                <td>
                                    {p.status === 'open' && can('finance.settings.manage') && (
                                        <button onClick={() => setCloseId(p.id)} className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--color-warning)' }}>
                                            <Lock className="h-3.5 w-3.5" /> إغلاق
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
                    <div className="edara-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" >فترة محاسبية جديدة</h2>
                            <button onClick={() => setShowForm(false)} className="btn btn-ghost"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="form-label">اسم الفترة *</label>
                                <input name="name" type="text" className="form-input" placeholder="مثال: 2026 Q1" required />
                            </div>
                            <div>
                                <label className="form-label">تاريخ البداية *</label>
                                <input name="start_date" type="date" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">تاريخ النهاية *</label>
                                <input name="end_date" type="date" className="form-input" required />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'جارٍ...' : 'إنشاء'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!closeId}
                title="إغلاق الفترة المحاسبية"
                message="هل أنت متأكد من إغلاق هذه الفترة؟ لن يمكن تسجيل قيود جديدة فيها."
                onConfirm={async () => {
                    if (!closeId) return
                    try {
                        await closeFiscalPeriod(closeId)
                        toast.success('تم إغلاق الفترة بنجاح')
                        loadPeriods()
                    } catch {
                        toast.error('فشل إغلاق الفترة')
                    } finally {
                        setCloseId(null)
                    }
                }}
                onCancel={() => setCloseId(null)}
            />
        </div>
    )
}
