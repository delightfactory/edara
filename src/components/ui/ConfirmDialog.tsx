import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning'
    loading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    open, title, message,
    confirmLabel = 'حذف',
    cancelLabel = 'إلغاء',
    variant = 'danger',
    loading = false,
    onConfirm, onCancel,
}: ConfirmDialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="edara-overlay" onClick={onCancel} />
            <div className="relative w-full max-w-sm rounded-2xl shadow-2xl animate-[scale-in_0.2s_ease-out]"
                style={{ backgroundColor: 'var(--card-bg)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 pb-0">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${variant === 'danger' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                            <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
                        </div>
                        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                            {title}
                        </h3>
                    </div>
                    <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                        <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 px-5 pb-5">
                    <button onClick={onCancel} disabled={loading} className="btn btn-secondary btn-sm">
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`btn btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                    >
                        {loading && (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
