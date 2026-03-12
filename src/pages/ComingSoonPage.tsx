import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Construction, Rocket } from 'lucide-react'

const moduleLabels: Record<string, string> = {
    '/sales': 'المبيعات',
    '/purchases': 'المشتريات',
    '/finance': 'المالية',
    '/reps': 'المندوبين',
    '/targets': 'الأهداف',
    '/commissions': 'العمولات',
    '/reports': 'التقارير',
}

export function ComingSoonPage() {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const moduleName = moduleLabels[pathname] || 'هذه الوحدة'

    return (
        <div className="flex min-h-[60vh] items-center justify-center animate-[fade-in_0.4s_ease-out]">
            <div className="text-center space-y-6 px-4">
                {/* Icon */}
                <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 animate-pulse" />
                    <div className="relative flex h-full w-full items-center justify-center">
                        <Construction className="h-16 w-16 text-amber-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        وحدة {moduleName} قيد التطوير
                    </h1>
                    <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                        يتم حالياً بناء هذه الوحدة بعناية لتوفير أفضل تجربة ممكنة.
                        سيتم إطلاقها في تحديث قادم.
                    </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="btn btn-primary"
                    >
                        <Home className="h-4 w-4" />
                        العودة للرئيسية
                    </button>
                    <div className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--empty-bg)', color: 'var(--text-muted)' }}>
                        <Rocket className="h-3.5 w-3.5" />
                        قريباً
                    </div>
                </div>
            </div>
        </div>
    )
}
