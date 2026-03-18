import { useState, useEffect } from 'react'
import { GitBranch } from 'lucide-react'
import { getChartOfAccounts } from '@/lib/services/finance'
import type { ChartOfAccount, ChartOfAccountWithChildren } from '@/lib/types/finance'
import { ACCOUNT_TYPE_LABELS } from '@/lib/types/finance'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

function buildTree(flat: ChartOfAccount[]): ChartOfAccountWithChildren[] {
    const map: Record<string, ChartOfAccountWithChildren> = {}
    flat.forEach(a => { map[a.id] = { ...a, children: [] } })
    const roots: ChartOfAccountWithChildren[] = []
    flat.forEach(a => {
        const node = map[a.id]
        if (!node) return
        const parent = a.parent_id ? map[a.parent_id] : undefined
        if (parent) {
            parent.children!.push(node)
        } else {
            roots.push(node)
        }
    })
    return roots
}

function AccountNode({ account, level }: { account: ChartOfAccountWithChildren; level: number }) {
    const [open, setOpen] = useState(level < 2)
    const hasChildren = account.children && account.children.length > 0

    return (
        <div>
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                style={{ paddingRight: `${level * 1.5 + 0.75}rem`, backgroundColor: level === 0 ? 'var(--card-bg)' : 'transparent' }}
                onClick={() => hasChildren && setOpen(!open)}>
                {hasChildren ? (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '▾' : '◂'}</span>
                ) : (
                    <span className="w-4" />
                )}
                <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>{account.code}</span>
                <span className="font-medium"  >{account.name}</span>
                <span className="text-xs mr-auto" style={{ color: 'var(--text-muted)' }}>{ACCOUNT_TYPE_LABELS[account.type]}</span>
                {!account.is_active && <span className="badge badge-secondary text-xs">غير نشط</span>}
                {account.is_system && <span className="badge badge-primary text-xs">نظامي</span>}
            </div>
            {open && hasChildren && (
                <div style={{ borderRight: '1px solid var(--divider-color)', marginRight: `${level * 1.5 + 1.5}rem` }}>
                    {account.children!.map(child => (
                        <AccountNode key={child.id} account={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

export function ChartOfAccountsPage() {
    usePageTitle('شجرة الحسابات')
    const [accounts, setAccounts] = useState<ChartOfAccountWithChildren[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getChartOfAccounts().then(data => {
            setAccounts(buildTree(data))
        }).catch(() => {
            toast.error('حدث خطأ في تحميل شجرة الحسابات')
        }).finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <GitBranch className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">شجرة الحسابات</h1>
                    <p className="page-subtitle">الدليل المحاسبي</p>
                </div>
            </div>

            <div className="edara-card p-4">
                {loading ? (
                    <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
                ) : accounts.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                        <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>لا توجد حسابات</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {accounts.map(a => <AccountNode key={a.id} account={a} level={0} />)}
                    </div>
                )}
            </div>
        </div>
    )
}
