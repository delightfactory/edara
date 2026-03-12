import { useEffect, useCallback } from 'react'

interface ShortcutActions {
    /** Called when Escape is pressed (close dialogs) */
    onEscape?: () => void
    /** Called when / is pressed (focus search) */
    onSearch?: () => void
}

/**
 * Register keyboard shortcuts for the current page.
 * - `Escape` → close dialogs or clear focus
 * - `/`      → focus the search input
 */
export function useKeyboardShortcuts({ onEscape, onSearch }: ShortcutActions) {
    const handler = useCallback((e: KeyboardEvent) => {
        // Don't trigger when typing in input/textarea/select
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
        const isContentEditable = target.isContentEditable

        // Escape works everywhere (to close dialogs)
        if (e.key === 'Escape' && onEscape) {
            e.preventDefault()
            onEscape()
            return
        }

        // / only works when NOT in an input field
        if (e.key === '/' && !isInput && !isContentEditable && onSearch) {
            e.preventDefault()
            onSearch()
            return
        }
    }, [onEscape, onSearch])

    useEffect(() => {
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handler])
}
