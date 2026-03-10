import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { LogIn, Eye, EyeOff, Loader2, Sparkles, Shield, BarChart3, Users } from 'lucide-react'

export function LoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
                } else {
                    setError('حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.')
                }
                return
            }

            navigate('/', { replace: true })
        } catch {
            setError('حدث خطأ غير متوقع. حاول مرة أخرى.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Right Panel — Login Form */}
            <div
                className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[520px]"
                style={{ backgroundColor: 'var(--card-bg)' }}
            >
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

                <div className="relative w-full max-w-sm">
                    {/* Logo */}
                    <div className="mb-10 text-center">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
                            <Sparkles className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            مرحباً بك في EDARA
                        </h1>
                        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                            سجّل دخولك للوصول إلى لوحة القيادة
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-light/50 p-4 text-sm text-danger animate-[scale-in_0.2s_ease-out]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10">
                                <Shield className="h-4 w-4" />
                            </div>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                البريد الإلكتروني
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                dir="ltr"
                                placeholder="example@company.com"
                                className="form-input h-12"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    dir="ltr"
                                    placeholder="••••••••"
                                    className="form-input h-12 pl-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4.5 w-4.5" />
                                    ) : (
                                        <Eye className="h-4.5 w-4.5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full h-12 text-sm font-semibold"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    <span>تسجيل الدخول</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Left Panel — Branding */}
            <div className="hidden flex-1 lg:flex relative overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-bl from-primary-600 via-primary-800 to-surface-950" />

                {/* Geometric pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                    backgroundSize: '32px 32px',
                }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
                    <div className="max-w-lg text-center">
                        {/* Big Logo */}
                        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-2xl">
                            <Sparkles className="h-10 w-10 text-white" />
                        </div>

                        <h2 className="text-5xl font-bold text-white tracking-tight mb-4">
                            EDARA
                        </h2>
                        <p className="text-lg leading-relaxed text-primary-200 mb-12">
                            نظام إدارة متكامل لشركة التوزيع
                            <br />
                            منتجات العناية بالسيارات وكمالياتها
                        </p>

                        {/* Feature cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: BarChart3, label: 'تقارير ذكية', desc: 'تحليلات فورية' },
                                { icon: Users, label: 'إدارة الفريق', desc: 'تتبع الأداء' },
                                { icon: Shield, label: 'أمان متقدم', desc: 'صلاحيات دقيقة' },
                            ].map((feature) => (
                                <div
                                    key={feature.label}
                                    className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 text-center transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105"
                                >
                                    <feature.icon className="mx-auto mb-3 h-7 w-7 text-primary-300 group-hover:text-white transition-colors" />
                                    <p className="text-sm font-semibold text-white mb-1">{feature.label}</p>
                                    <p className="text-xs text-primary-300/70">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
