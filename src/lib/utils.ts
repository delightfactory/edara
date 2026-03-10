import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format currency in Egyptian Pounds
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

/**
 * Format number with Arabic locale
 */
export function formatNumber(num: number, decimals = 0): string {
    return new Intl.NumberFormat('ar-EG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num)
}

/**
 * Format date in Arabic
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date))
}

/**
 * Format short date (DD/MM/YYYY)
 */
export function formatShortDate(date: string | Date): string {
    return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(date))
}

/**
 * Format relative time (e.g. "منذ 5 دقائق")
 */
export function formatRelativeTime(date: string | Date): string {
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return 'الآن'
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`
    return formatShortDate(date)
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

/**
 * Generate initials from name (for avatars)
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
}
