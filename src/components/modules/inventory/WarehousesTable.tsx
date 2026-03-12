import {
    Warehouse as WarehouseIcon, Pencil, Trash2, Loader2, Plus,
    Truck, Building2, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WarehouseWithRefs, WarehouseType } from '@/lib/types/inventory'
import { WAREHOUSE_TYPE_LABELS } from '@/lib/types/inventory'

interface WarehousesTableProps {
    warehouses: WarehouseWithRefs[]
    loading: boolean
    canUpdate: boolean
    canDelete: boolean
    canCreate: boolean
    deleting: string | null
    onEdit: (w: WarehouseWithRefs) => void
    onDelete: (id: string) => void
    onCreateFirst: () => void
}

const typeIcons: Record<WarehouseType, typeof WarehouseIcon> = {
    main: WarehouseIcon,
    branch: Building2,
    van: Truck,
    scrap: AlertTriangle,
}

const typeBadge: Record<WarehouseType, string> = {
    main: 'badge-primary',
    branch: 'badge-info',
    van: 'badge-warning',
    scrap: 'badge-danger',
}

export function WarehousesTable({
    warehouses, loading, canUpdate, canDelete, canCreate, deleting,
    onEdit, onDelete, onCreateFirst,
}: WarehousesTableProps) {
    return (
        <div className="edara-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '600px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المستودع</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>النوع</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الموقع</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>المسؤول</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                            {canUpdate && <th className="px-4 py-3 w-20"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--divider-color)' }}>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-24" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                </tr>
                            ))
                        ) : warehouses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <WarehouseIcon className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>لا توجد مستودعات بعد</p>
                                        {canCreate && (
                                            <button onClick={onCreateFirst} className="btn btn-primary btn-sm mt-1">
                                                <Plus className="h-4 w-4" /> أضف أول مستودع
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            warehouses.map((w, i) => {
                                const TypeIcon = typeIcons[w.type]
                                const responsible = w.type === 'van'
                                    ? w.assigned_rep?.full_name
                                    : w.manager?.full_name

                                return (
                                    <tr key={w.id} className="edara-tr-hover transition-all duration-200"
                                        style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${i * 40}ms backwards` }}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30 shrink-0">
                                                    <TypeIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                                </div>
                                                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('badge', typeBadge[w.type])}>{WAREHOUSE_TYPE_LABELS[w.type]}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{w.location || '—'}</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {responsible || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('badge', w.is_active ? 'badge-success' : 'badge-danger')}>{w.is_active ? 'نشط' : 'معطّل'}</span>
                                        </td>
                                        {canUpdate && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => onEdit(w)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                                                        <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    {canDelete && (
                                                        <button onClick={() => onDelete(w.id)} disabled={deleting === w.id}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                                            {deleting === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
