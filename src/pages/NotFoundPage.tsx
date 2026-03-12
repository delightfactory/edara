import { useNavigate } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export function NotFoundPage() {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-[60vh] items-center justify-center animate-[fade-in_0.4s_ease-out]">
            <div className="text-center space-y-6 px-4">
                {/* Animated 404 */}
                <div className="relative mx-auto w-40 h-40">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 animate-pulse" />
                    <div className="relative flex h-full w-full items-center justify-center">
                        <span className="text-7xl font-bold bg-gradient-to-br from-primary-600 to-accent-600 bg-clip-text text-transparent select-none">
                            404
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-warning)' }} />
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            الصفحة غير موجودة
                        </h1>
                    </div>
                    <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                        عذراً، لم نتمكن من العثور على الصفحة المطلوبة. قد تكون قد حُذفت أو تم تغيير عنوانها.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="btn btn-primary mx-auto"
                >
                    <Home className="h-4 w-4" />
                    العودة للرئيسية
                </button>
            </div>
        </div>
    )
}
