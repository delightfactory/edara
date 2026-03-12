/**
 * Export data to a CSV file and download it.
 *
 * @param data   Array of objects to export
 * @param columns  Column definitions: { key, label }
 * @param filename  Filename without extension
 */
export function exportToCSV<T extends object>(
    data: T[],
    columns: { key: keyof T; label: string }[],
    filename: string
): void {
    if (data.length === 0) return

    // Unicode BOM for Arabic/Excel compatibility
    const BOM = '\uFEFF'

    // Header row
    const header = columns.map(c => escapeCSV(c.label)).join(',')

    // Data rows
    const rows = data.map(row =>
        columns.map(c => {
            const val = row[c.key]
            if (val === null || val === undefined) return ''
            if (typeof val === 'number') return String(val)
            if (typeof val === 'boolean') return val ? 'نعم' : 'لا'
            return escapeCSV(String(val))
        }).join(',')
    )

    const csv = BOM + [header, ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function escapeCSV(value: string): string {
    // If the value contains comma, newline, or double-quote, wrap in quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}
