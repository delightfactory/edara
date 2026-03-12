import { useState, useEffect } from 'react'
import { Settings, Save, Loader2, Building2, DollarSign, ShoppingCart, Users, Monitor } from 'lucide-react'
import { getCompanySettings, updateCompanySetting, type CompanySetting } from '@/lib/services/settings'
import { useAuthStore } from '@/stores/auth-store'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

const categoryConfig: Record<string, { label: string; icon: typeof Settings }> = {
    general: { label: 'بيانات الشركة', icon: Building2 },
    financial: { label: 'الإعدادات المالية', icon: DollarSign },
    sales: { label: 'إعدادات المبيعات', icon: ShoppingCart },
    crm: { label: 'إدارة العملاء', icon: Users },
    reps: { label: 'المندوبين', icon: Users },
    system: { label: 'النظام', icon: Monitor },
}

const keyLabels: Record<string, string> = {
    company_name: 'اسم الشركة',
    company_phone: 'هاتف الشركة',
    company_email: 'البريد الإلكتروني',
    company_address: 'العنوان',
    company_tax_number: 'الرقم الضريبي',
    default_currency: 'العملة الافتراضية',
    fiscal_year_start: 'بداية السنة المالية',
    default_payment_terms: 'شروط الدفع الافتراضية',
    credit_limit_check: 'فحص حد الائتمان',
    min_margin_percent: 'نسبة الهامش الأدنى %',
    require_price_approval: 'اعتماد تغيير الأسعار',
    auto_generate_customer_code: 'توليد كود العميل تلقائياً',
    visit_reminder_days: 'أيام تذكير الزيارة',
    gps_required_for_visits: 'GPS مطلوب للزيارات',
    max_rows_per_page: 'عدد الصفوف في الصفحة',
}

export function SettingsPage() {
    usePageTitle('الإعدادات')
    const [settings, setSettings] = useState<CompanySetting[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [editedValues, setEditedValues] = useState<Record<string, string>>({})
    const { can } = useAuthStore()
    const canUpdate = can('settings.general.update')

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const data = await getCompanySettings()
            setSettings(data)
        } catch {
            toast.error('خطأ في تحميل الإعدادات')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (key: string) => {
        const value = editedValues[key]
        if (value === undefined) return

        setSaving(key)
        try {
            await updateCompanySetting(key, value)
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
            setEditedValues(prev => { const n = { ...prev }; delete n[key]; return n })
            toast.success('تم حفظ الإعداد بنجاح')
        } catch {
            toast.error('خطأ في حفظ الإعداد')
        } finally {
            setSaving(null)
        }
    }

    const grouped = settings.reduce<Record<string, CompanySetting[]>>((acc, s) => {
        const cat = s.category
        if (!acc[cat]) acc[cat] = []
        acc[cat]!.push(s)
        return acc
    }, {})

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
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <Settings className="h-5.5 w-5.5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">إعدادات النظام</h1>
                    <p className="page-subtitle">إعدادات الشركة والتكوينات العامة</p>
                </div>
            </div>

            {/* Settings Groups */}
            {Object.entries(grouped).map(([category, items]) => {
                const config = categoryConfig[category] || { label: category, icon: Settings }
                const CategoryIcon = config.icon

                return (
                    <div key={category} className="edara-card p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 mb-5" style={{ borderBottom: '1px solid var(--divider-color)', paddingBottom: '1rem' }}>
                            <CategoryIcon className="h-5 w-5 text-primary-500" />
                            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{config.label}</h2>
                        </div>

                        <div className="space-y-4">
                            {items.map((setting) => {
                                const currentValue = editedValues[setting.key] ?? setting.value
                                const isEdited = editedValues[setting.key] !== undefined
                                const isBool = setting.value === 'true' || setting.value === 'false'

                                return (
                                    <div key={setting.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                        <label className="text-sm font-medium sm:w-48 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                            {keyLabels[setting.key] || setting.key}
                                        </label>
                                        <div className="flex flex-1 items-center gap-2">
                                            {isBool ? (
                                                <button
                                                    onClick={() => {
                                                        const newVal = currentValue === 'true' ? 'false' : 'true'
                                                        setEditedValues(prev => ({ ...prev, [setting.key]: newVal }))
                                                    }}
                                                    className={`relative h-7 w-12 rounded-full transition-colors ${currentValue === 'true' ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'} ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={!canUpdate}
                                                >
                                                    <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: currentValue === 'true' ? '0.125rem' : 'calc(100% - 1.625rem)' }} />
                                                </button>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={currentValue}
                                                    onChange={(e) => setEditedValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                                                    className="form-input h-10 text-sm"
                                                    dir={/^[a-zA-Z0-9]/.test(currentValue) ? 'ltr' : 'rtl'}
                                                    readOnly={!canUpdate}
                                                />
                                            )}
                                            {isEdited && (
                                                <button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={saving === setting.key}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    {saving === setting.key ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="h-3.5 w-3.5" />
                                                    )}
                                                    حفظ
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
