import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, Search, Filter, X, Eye } from 'lucide-react'
import { getCompanySettings } from '@/lib/services/settings'
import { getJournalEntries, getJournalEntry } from '@/lib/services/finance'
import type { JournalEntryWithLines, JournalEntryFilters, JournalStatus } from '@/lib/types/finance'
import { JOURNAL_STATUS_LABELS } from '@/lib/types/finance'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'

export function JournalEntriesPage() {
    usePageTitle('القيود المحاسبية')

    const [entries, setEntries] = useState<JournalEntryWithLines[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(25)

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const [filterStatus, setFilterStatus] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    // Detail
    const [selectedEntry, setSelectedEntry] = useState<JournalEntryWithLines | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const totalPages = Math.ceil(total / pageSize)

    useEffect(() => {
        getCompanySettings().then(settings => {
            const maxRows = settings.find(s => s.key === 'max_rows_per_page')
            if (maxRows?.value) setPageSize(Math.min(Number(maxRows.value) || 25, 50))
        }).catch(() => { })
    }, [])

    const loadEntries = useCallback(async () => {
        setLoading(true)
        try {
            const filters: JournalEntryFilters = {
                page, pageSize,
                search: debouncedSearch || undefined,
                status: (filterStatus as JournalStatus) || undefined,
            }
            const result = await getJournalEntries(filters)
            setEntries(result.data)
            setTotal(result.total)
        } catch {
            toast.error('حدث خطأ في تحميل القيود')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus])

    useEffect(() => { loadEntries() }, [loadEntries])

    const viewEntry = async (id: string) => {
        setDetailLoading(true)
        try {
            const entry = await getJournalEntry(id)
            setSelectedEntry(entry)
        } catch {
            toast.error('خطأ في تحميل القيد')
        } finally {
            setDetailLoading(false)
        }
    }

    const formatCurrency = (v: number) => v.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">القيود المحاسبية</h1>
                    <p className="page-subtitle">{total} قيد</p>
                </div>
            </div>

            {/* Filters */}
            <div className="edara-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <input ref={searchRef} type="text" placeholder="بحث برقم القيد أو الوصف..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.5rem' }} />
                    </div>
                    <div className="relative" style={{ minWidth: '9rem' }}>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                            className="form-input" style={{ paddingInlineStart: '2.25rem' }}>
                            <option value="">كل الحالات</option>
                            {(Object.entries(JOURNAL_STATUS_LABELS) as [JournalStatus, string][]).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {(search || filterStatus) && (
                        <button onClick={() => { setSearch(''); setFilterStatus(''); setPage(1) }}
                            className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                            <X className="h-3.5 w-3.5" /> مسح
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="edara-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>التاريخ</th>
                            <th>الوصف</th>
                            <th>مدين</th>
                            <th>دائن</th>
                            <th>المصدر</th>
                            <th>الحالة</th>
                            <th>عرض</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="data-table-empty">جارٍ التحميل...</td></tr>
                        ) : entries.length === 0 ? (
                            <tr><td colSpan={8} className="data-table-empty">لا توجد قيود</td></tr>
                        ) : entries.map(e => (
                            <tr key={e.id}>
                                <td className="font-mono text-sm" >{e.entry_number}</td>
                                <td >{new Date(e.date).toLocaleDateString('ar-EG')}</td>
                                <td className="max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>{e.description}</td>
                                <td className="font-semibold" >{formatCurrency(e.total_debit)}</td>
                                <td className="font-semibold" >{formatCurrency(e.total_credit)}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{e.source_type || '—'}</td>
                                <td><span className={`badge ${e.status === 'posted' ? 'badge-success' : 'badge-secondary'}`}>{JOURNAL_STATUS_LABELS[e.status]}</span></td>
                                <td>
                                    <button onClick={() => viewEntry(e.id)} className="btn btn-ghost text-xs">
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-sm">السابق</button>
                    <span className="flex items-center px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-sm">التالي</button>
                </div>
            )}

            {/* Entry Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedEntry(null)}>
                    <div className="edara-card w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" >قيد رقم: {selectedEntry.entry_number}</h2>
                            <button onClick={() => setSelectedEntry(null)} className="btn btn-ghost"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div><span style={{ color: 'var(--text-muted)' }}>التاريخ:</span> <span >{new Date(selectedEntry.date).toLocaleDateString('ar-EG')}</span></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>الحالة:</span> <span className={`badge ${selectedEntry.status === 'posted' ? 'badge-success' : 'badge-secondary'}`}>{JOURNAL_STATUS_LABELS[selectedEntry.status]}</span></div>
                            <div className="col-span-2"><span style={{ color: 'var(--text-muted)' }}>الوصف:</span> <span >{selectedEntry.description}</span></div>
                        </div>
                        {detailLoading ? (
                            <div className="data-table-empty">جارٍ التحميل...</div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>كود الحساب</th>
                                        <th>اسم الحساب</th>
                                        <th>مدين</th>
                                        <th>دائن</th>
                                        <th>البيان</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedEntry.lines || []).map(line => (
                                        <tr key={line.id}>
                                            <td className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>{line.account?.code}</td>
                                            <td >{line.account?.name}</td>
                                            <td className="font-semibold" style={{ color: line.debit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                                            <td className="font-semibold" style={{ color: line.credit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{line.description || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--divider-color)' }}>
                                        <td colSpan={2} className="font-bold" >الإجمالي</td>
                                        <td className="font-bold" >{formatCurrency(selectedEntry.total_debit)}</td>
                                        <td className="font-bold" >{formatCurrency(selectedEntry.total_credit)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
