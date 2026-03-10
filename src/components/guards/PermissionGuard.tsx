import { useAuthStore } from '@/stores/auth-store'

interface PermissionGuardProps {
    permission: string | string[]
    mode?: 'any' | 'all'
    fallback?: React.ReactNode
    children: React.ReactNode
}

/**
 * Conditionally renders children based on user permissions.
 * Use this to show/hide UI elements based on access control.
 * 
 * @example
 * <PermissionGuard permission="crm.customers.create">
 *   <Button>إضافة عميل</Button>
 * </PermissionGuard>
 * 
 * <PermissionGuard permission={['sales.invoices.create', 'sales.invoices.update']} mode="any">
 *   <InvoiceForm />
 * </PermissionGuard>
 */
export function PermissionGuard({
    permission,
    mode = 'any',
    fallback = null,
    children,
}: PermissionGuardProps) {
    const { canAny, canAll } = useAuthStore()

    const perms = Array.isArray(permission) ? permission : [permission]

    const hasAccess = mode === 'all' ? canAll(perms) : canAny(perms)

    if (!hasAccess) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

/**
 * Hook for programmatic permission checks.
 */
export function usePermission() {
    const store = useAuthStore()
    return { can: store.can, canAny: store.canAny, canAll: store.canAll }
}
