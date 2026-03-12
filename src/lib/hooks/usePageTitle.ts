import { useEffect } from 'react'

/**
 * Sets the document title dynamically for each page.
 * Usage: usePageTitle('المنتجات')
 */
export function usePageTitle(title: string) {
    useEffect(() => {
        document.title = title ? `${title} | إدارة` : 'إدارة'
        return () => { document.title = 'إدارة' }
    }, [title])
}
