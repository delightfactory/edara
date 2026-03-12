import { useState, useEffect } from 'react'

/**
 * Debounce a value by a specified delay.
 * Returns the debounced value that only updates after the delay.
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debounced
}
