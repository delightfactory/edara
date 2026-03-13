import { supabase } from '@/lib/supabase/client'

export interface DashboardStats {
    totalProducts: number
    activeCustomers: number
    totalWarehouses: number
    activeEmployees: number
    lowStockCount: number
}

export interface RecentActivity {
    id: string
    table_name: string
    action: string
    record_id: string
    created_at: string
    user_name: string | null
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const [products, customers, warehouses, employees, lowStock] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.rpc('get_low_stock_count'),
    ])

    return {
        totalProducts: products.count || 0,
        activeCustomers: customers.count || 0,
        totalWarehouses: warehouses.count || 0,
        activeEmployees: employees.count || 0,
        lowStockCount: (lowStock.data as number) || 0,
    }
}

export async function getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    const { data, error } = await supabase
        .from('audit_log')
        .select('id, table_name, action, record_id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error || !data) return []

    // Collect unique user IDs and fetch names in one query
    const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))]
    let userMap: Record<string, string> = {}
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)
        if (profiles) {
            userMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]))
        }
    }

    return data.map(row => ({
        id: row.id as string,
        table_name: row.table_name as string,
        action: row.action as string,
        record_id: row.record_id as string,
        created_at: row.created_at as string,
        user_name: row.user_id ? (userMap[row.user_id] || null) : null,
    }))
}

// ── Low Stock Products (L4) ──────────────────────────────────

export interface LowStockProduct {
    product_name: string
    warehouse_name: string
    quantity: number
    min_stock: number
}

export async function getLowStockProducts(limit = 5): Promise<LowStockProduct[]> {
    const { data, error } = await supabase
        .from('stock')
        .select('quantity, product:products!product_id ( name, min_stock ), warehouse:warehouses!warehouse_id ( name )')
        .gt('quantity', 0)

    if (error || !data) return []

    const results: LowStockProduct[] = []
    for (const row of data) {
        const product = row.product as unknown as { name: string; min_stock: number } | null
        const warehouse = row.warehouse as unknown as { name: string } | null
        if (product && product.min_stock > 0 && (row.quantity as number) <= product.min_stock) {
            results.push({
                product_name: product.name,
                warehouse_name: warehouse?.name || '—',
                quantity: row.quantity as number,
                min_stock: product.min_stock,
            })
        }
    }

    return results.slice(0, limit)
}

