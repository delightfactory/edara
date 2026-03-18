import { useEffect, useRef } from 'react'

/**
 * Hook to detect clicks outside a referenced element.
 * Calls `onClose` when a click occurs outside the ref.
 */
export function useClickOutside<T extends HTMLElement>(
    onClose: () => void,
    active: boolean = true
) {
    const ref = useRef<T>(null)

    useEffect(() => {
        if (!active) return

        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose, active])

    return ref
}
