import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

interface UseImageUploadOptions {
    bucket: string
    maxSizeMB?: number
    /** Optional subfolder path (e.g. 'products' or user uid) */
    folder?: string
}

interface UploadResult {
    url: string
    path: string
}

export function useImageUpload({ bucket, maxSizeMB = 5, folder }: UseImageUploadOptions) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)

    const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
        setError(null)

        // Validate size
        const maxBytes = maxSizeMB * 1024 * 1024
        if (file.size > maxBytes) {
            setError(`حجم الملف يتجاوز الحد المسموح (${maxSizeMB}MB)`)
            return null
        }

        // Validate type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
            setError('نوع الملف غير مدعوم — يُقبل: JPG, PNG, WebP, GIF, SVG')
            return null
        }

        setUploading(true)
        setProgress(0)

        try {
            // Generate unique filename
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 8)
            const fileName = `${timestamp}_${random}.${ext}`
            const filePath = folder ? `${folder}/${fileName}` : fileName

            setProgress(30)

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                })

            if (uploadError) throw uploadError

            setProgress(80)

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            setProgress(100)

            return {
                url: urlData.publicUrl,
                path: filePath,
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'فشل رفع الملف'
            setError(message)
            return null
        } finally {
            setUploading(false)
        }
    }, [bucket, maxSizeMB, folder])

    const remove = useCallback(async (path: string): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase.storage
                .from(bucket)
                .remove([path])

            if (deleteError) throw deleteError
            return true
        } catch {
            setError('فشل حذف الملف')
            return false
        }
    }, [bucket])

    const reset = useCallback(() => {
        setError(null)
        setProgress(0)
    }, [])

    return { upload, remove, uploading, progress, error, reset }
}
