import {
    FolderTree, Pencil, Trash2, Loader2, Plus, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types/products'

interface CategoriesTableProps {
    categories: Category[]
    allCategories: Category[]
    loading: boolean
    canUpdate: boolean
    canDelete: boolean
    canCreate: boolean
    deleting: string | null
    onEdit: (cat: Category) => void
    onDelete: (id: string) => void
    onCreateFirst: () => void
}

export function CategoriesTable({
    categories, allCategories, loading,
    canUpdate, canDelete, canCreate, deleting,
    onEdit, onDelete, onCreateFirst,
}: CategoriesTableProps) {
    const getParentName = (parentId: string | null) => {
        if (!parentId) return null
        return allCategories.find(c => c.id === parentId)?.name || null
    }

    const roots = categories.filter(c => !c.parent_id)
    const children = (parentId: string) => categories.filter(c => c.parent_id === parentId)

    let rowIndex = 0
    const renderRow = (cat: Category, depth: number) => (
        <tr
            key={cat.id}
            className="edara-tr-hover transition-all duration-200"
            style={{ borderBottom: '1px solid var(--divider-color)', animation: `fade-in 0.3s ease-out ${rowIndex++ * 40}ms backwards` }}
        >
            <td className="px-4 py-3">
                <div className="flex items-center gap-2" style={{ paddingRight: `${depth * 24}px` }}>
                    {depth > 0 && <ChevronDown className="h-3 w-3 rotate-[-90deg]" style={{ color: 'var(--text-muted)' }} />}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30 shrink-0">
                        <FolderTree className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                </div>
            </td>
            <td className="px-4 py-3">
                {getParentName(cat.parent_id) ? (
                    <span className="badge badge-info text-[10px]">{getParentName(cat.parent_id)}</span>
                ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>رئيسي</span>
                )}
            </td>
            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{cat.sort_order}</td>
            <td className="px-4 py-3">
                <span className={cn('badge', cat.is_active ? 'badge-success' : 'badge-danger')}>{cat.is_active ? 'نشط' : 'معطّل'}</span>
            </td>
            {canUpdate && (
                <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(cat)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/30" title="تعديل">
                            <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        {canDelete && (
                            <button onClick={() => onDelete(cat.id)} disabled={deleting === cat.id}
                                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
                                {deleting === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
                            </button>
                        )}
                    </div>
                </td>
            )}
        </tr>
    )

    const renderTree = (parent: Category): React.ReactNode[] => {
        const rows: React.ReactNode[] = [renderRow(parent, parent.parent_id ? 1 : 0)]
        for (const child of children(parent.id)) {
            rows.push(...renderTree(child))
        }
        return rows
    }

    return (
        <div className="edara-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '500px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>التصنيف</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الأب</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>الترتيب</th>
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
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-8" /></td>
                                    <td className="px-4 py-3"><div className="skeleton h-4 w-10" /></td>
                                </tr>
                            ))
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--empty-bg)' }}>
                                            <FolderTree className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>لا توجد تصنيفات بعد</p>
                                        {canCreate && (
                                            <button onClick={onCreateFirst} className="btn btn-primary btn-sm mt-1">
                                                <Plus className="h-4 w-4" /> أضف أول تصنيف
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            roots.map(r => renderTree(r))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
