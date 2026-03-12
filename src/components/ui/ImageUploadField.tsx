import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Upload, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImageUpload } from '@/lib/hooks/useImageUpload'

interface ImageUploadFieldProps {
    /** Current image URL (to show preview) */
    value: string | null | undefined
    /** Called with the new public URL after upload, or null when removed */
    onChange: (url: string | null) => void
    /** Supabase bucket name */
    bucket: string
    /** Optional folder within bucket */
    folder?: string
    /** Max file size in MB */
    maxSizeMB?: number
    /** Label for the field */
    label?: string
    /** Whether field is disabled */
    disabled?: boolean
    /** CSS class for the container */
    className?: string
}

export function ImageUploadField({
    value,
    onChange,
    bucket,
    folder,
    maxSizeMB = 5,
    label = 'الصورة',
    disabled = false,
    className,
}: ImageUploadFieldProps) {
    const { upload, uploading, error, reset } = useImageUpload({ bucket, maxSizeMB, folder })
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)

    const handleFile = async (file: File) => {
        reset()
        const result = await upload(file)
        if (result) {
            onChange(result.url)
        }
    }

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
        // Reset input so same file can be re-selected
        e.target.value = ''
    }

    const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled || uploading) return
        const file = e.dataTransfer.files?.[0]
        if (file) handleFile(file)
    }

    const handleRemove = () => {
        onChange(null)
        reset()
    }

    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                </label>
            )}

            {/* Preview or Upload area */}
            {value ? (
                <div className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                    <img
                        src={value}
                        alt={label}
                        className="w-full h-32 object-contain rounded-xl"
                        style={{ backgroundColor: 'var(--empty-bg)' }}
                    />
                    {!disabled && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                title="استبدال"
                            >
                                <Upload className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-red-500/80 text-white transition-colors"
                                title="حذف"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => !disabled && !uploading && inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    disabled={disabled || uploading}
                    className={cn(
                        'w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 px-4 text-center transition-all duration-200',
                        dragOver ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20' : '',
                        !disabled && !uploading ? 'cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-950/10' : 'opacity-50 cursor-not-allowed'
                    )}
                    style={{ borderColor: dragOver ? undefined : 'var(--card-border)' }}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>جاري الرفع...</span>
                        </>
                    ) : (
                        <>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                <ImageIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div>
                                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                    اسحب الصورة هنا أو <span className="text-primary-600">تصفح</span>
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    JPG, PNG, WebP — حد أقصى {maxSizeMB}MB
                                </p>
                            </div>
                        </>
                    )}
                </button>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleInputChange}
                className="hidden"
            />
        </div>
    )
}
