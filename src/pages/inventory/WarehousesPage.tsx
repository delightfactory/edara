import { useState, useEffect } from 'react'
import { Warehouse as WarehouseIcon, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
    getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
    getProfileLookups,
} from '@/lib/services/inventory'
import type { WarehouseWithRefs, WarehouseInput } from '@/lib/types/inventory'
import type { ProfileLookup } from '@/lib/types/inventory'
import { WarehousesTable } from '@/components/modules/inventory/WarehousesTable'
import { WarehouseFormDialog } from '@/components/modules/inventory/WarehouseFormDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function WarehousesPage() {
    usePageTitle('المستودعات')
    const { can } = useAuthStore()
    const [warehouses, setWarehouses] = useState<WarehouseWithRefs[]>([])
    const [profiles, setProfiles] = useState<ProfileLookup[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<WarehouseWithRefs | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const [w, p] = await Promise.all([getWarehouses(), getProfileLookups()])
            setWarehouses(w)
            setProfiles(p)
        } catch {
            toast.error('حدث خطأ في تحميل المستودعات')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const handleSave = async (data: Partial<WarehouseInput>, isEdit: boolean) => {
        if (!data.name?.trim()) { toast.error('يرجى إدخال اسم المستودع'); return }
        setSaving(true)
        try {
            if (isEdit && editing) {
                await updateWarehouse(editing.id, data)
                toast.success('تم تحديث المستودع')
            } else {
                await createWarehouse(data)
                toast.success('تم إنشاء المستودع')
            }
            setShowForm(false)
            loadData()
        } catch {
            toast.error(isEdit ? 'فشل تحديث المستودع' : 'فشل إنشاء المستودع')
        } finally {
            setSaving(false)
        }
    }

    const [confirmId, setConfirmId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setConfirmId(null)
        setDeleting(id)
        try {
            await deleteWarehouse(id)
            toast.success('تم حذف المستودع')
            loadData()
        } catch {
            toast.error('فشل الحذف — قد يحتوي على أرصدة مخزنية')
        } finally {
            setDeleting(null)
        }
    }

    const openCreate = () => { setEditing(null); setShowForm(true) }
    const openEdit = (w: WarehouseWithRefs) => { setEditing(w); setShowForm(true) }

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                        <WarehouseIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">المستودعات</h1>
                        <p className="page-subtitle">{warehouses.length} مستودع</p>
                    </div>
                </div>
                {can('inventory.warehouses.create') && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus className="h-4 w-4" /> إضافة مستودع
                    </button>
                )}
            </div>

            <WarehousesTable
                warehouses={warehouses} loading={loading}
                canUpdate={can('inventory.warehouses.update')}
                canDelete={can('inventory.warehouses.delete')}
                canCreate={can('inventory.warehouses.create')}
                deleting={deleting}
                onEdit={openEdit} onDelete={id => setConfirmId(id)} onCreateFirst={openCreate}
            />

            <ConfirmDialog open={!!confirmId} title="حذف المستودع" message="هل أنت متأكد من حذف هذا المستودع؟ لا يمكن التراجع عن هذا الإجراء."
                loading={!!deleting} onConfirm={() => confirmId && handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />

            <WarehouseFormDialog
                open={showForm} warehouse={editing}
                profiles={profiles} saving={saving}
                onClose={() => setShowForm(false)} onSave={handleSave}
            />
        </div>
    )
}
