import { useState, useEffect } from 'react'
import { FolderTree, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/services/products'
import type { Category, CategoryInput } from '@/lib/types/products'
import { CategoriesTable } from '@/components/modules/products/CategoriesTable'
import { CategoryFormDialog } from '@/components/modules/products/CategoryFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function CategoriesPage() {
    usePageTitle('التصنيفات')
    const { can } = useAuthStore()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await getCategories()
            setCategories(data)
        } catch {
            toast.error('حدث خطأ في تحميل التصنيفات')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const handleSave = async (data: Partial<CategoryInput>, isEdit: boolean) => {
        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم التصنيف'); return }
        setSaving(true)
        try {
            if (isEdit && editing) {
                await updateCategory(editing.id, data)
                toast.success('تم تحديث التصنيف')
            } else {
                await createCategory(data)
                toast.success('تم إنشاء التصنيف')
            }
            setShowForm(false)
            loadData()
        } catch {
            toast.error(isEdit ? 'فشل تحديث التصنيف' : 'فشل إنشاء التصنيف')
        } finally {
            setSaving(false)
        }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteCategory(id)
            toast.success('تم حذف التصنيف')
            loadData()
        } catch {
            toast.error('فشل الحذف — قد يكون مرتبطاً بمنتجات')
        } finally {
            setDeleting(null)
        }
    }

    const openCreate = () => { setEditing(null); setShowForm(true) }
    const openEdit = (c: Category) => { setEditing(c); setShowForm(true) }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <FolderTree className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">التصنيفات</h1>
                        <p className="page-subtitle">{categories.length} تصنيف</p>
                    </div>
                </div>
                {can('products.categories.create') && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة تصنيف
                    </button>
                )}
            </div>

            <CategoriesTable
                categories={categories} allCategories={categories}
                loading={loading}
                canUpdate={can('products.categories.update')}
                canDelete={can('products.categories.delete')}
                canCreate={can('products.categories.create')}
                deleting={deleting}
                onEdit={openEdit} onDelete={id => setConfirmId(id)} onCreateFirst={openCreate}
            />

            <ConfirmDialog open={!!confirmId} title="حذف التصنيف" message="هل أنت متأكد من حذف هذا التصنيف؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            <CategoryFormDialog
                open={showForm} category={editing}
                categories={categories} saving={saving}
                onClose={() => setShowForm(false)} onSave={handleSave}
            />
        </div>
    )
}
