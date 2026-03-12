import { useState, useEffect } from 'react'
import { X, Loader2, FolderTree, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Category, CategoryInput } from '@/lib/types/products'
import { ImageUploadField } from '@/components/ui/ImageUploadField'

interface CategoryFormDialogProps {
    open: boolean
    category: Category | null
    categories: Category[]
    saving: boolean
    onClose: () => void
    onSave: (data: Partial<CategoryInput>, isEdit: boolean) => void
}

export function CategoryFormDialog({
    open, category, categories, saving, onClose, onSave,
}: CategoryFormDialogProps) {
    const [form, setForm] = useState<Partial<CategoryInput>>({})

    useEffect(() => {
        if (open) {
            if (category) {
                setForm({ name: category.name, parent_id: category.parent_id, image_url: category.image_url, sort_order: category.sort_order, is_active: category.is_active })
            } else {
                setForm({ name: '', parent_id: null, image_url: null, sort_order: 0, is_active: true })
            }
        }
    }, [open, category])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4">
            <div className="fixed inset-0" style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-[scale-in_0.2s_ease-out] overflow-hidden"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

                {/* Gradient Header */}
                <div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                                <FolderTree className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{category ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}</h2>
                                <p className="text-xs text-primary-200 mt-0.5">{category ? `تعديل بيانات ${category.name}` : 'أدخل بيانات التصنيف'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>اسم التصنيف *</label>
                        <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="form-input" placeholder="مثال: شامبوهات" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>التصنيف الأب</label>
                        <select value={form.parent_id || ''} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value || null }))} className="form-input">
                            <option value="">— تصنيف رئيسي —</option>
                            {categories.filter(c => c.id !== category?.id).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ترتيب العرض</label>
                        <input type="number" value={form.sort_order || 0} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                            className="form-input" dir="ltr" min={0} />
                    </div>
                    <ImageUploadField
                        value={form.image_url}
                        onChange={(url) => setForm(f => ({ ...f, image_url: url }))}
                        bucket="category-images"
                        folder="categories"
                        label="صورة التصنيف"
                    />
                    <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                        className="flex items-center justify-between rounded-xl px-4 py-3 w-full transition-all duration-200"
                        style={{ backgroundColor: 'var(--empty-bg)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>نشط</span>
                        {form.is_active ? <ToggleRight className="h-6 w-6 text-success" /> : <ToggleLeft className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider-color)' }}>
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={() => onSave(form, !!category)} disabled={saving || !form.name?.trim()} className="btn btn-primary">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {category ? 'تحديث' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    )
}
