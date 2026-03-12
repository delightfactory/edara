import {
    LayoutDashboard,
    Users,
    Package,
    Warehouse,
    HandshakeIcon,
    ShoppingCart,
    Truck,
    DollarSign,
    Target,
    Award,
    BarChart3,
    Settings,
    MapPin,
    Shield,
    Building2,
    FileText,
    FolderTree,
    Boxes,
    UserCircle2,
    Ruler,
    ArrowDownUp,
    type LucideIcon,
} from 'lucide-react'

export interface NavItem {
    label: string
    href: string
    icon: LucideIcon
    permission?: string
    children?: NavItem[]
}

export interface NavGroup {
    label: string
    items: NavItem[]
}

export const navigationConfig: NavGroup[] = [
    {
        label: 'الرئيسية',
        items: [
            {
                label: 'لوحة القيادة',
                href: '/',
                icon: LayoutDashboard,
            },
        ],
    },
    {
        label: 'البيانات الأساسية',
        items: [
            {
                label: 'المنتجات',
                href: '/products',
                icon: Package,
                permission: 'products.products.read',
            },
            {
                label: 'التصنيفات',
                href: '/products/categories',
                icon: FolderTree,
                permission: 'products.categories.create',
            },
            {
                label: 'قوائم الأسعار',
                href: '/products/price-lists',
                icon: DollarSign,
                permission: 'products.prices.read',
            },
            {
                label: 'وحدات القياس',
                href: '/products/units',
                icon: Ruler,
                permission: 'products.products.read',
            },
            {
                label: 'العلامات التجارية',
                href: '/products/brands',
                icon: Award,
                permission: 'products.products.read',
            },
            {
                label: 'المخازن',
                href: '/inventory',
                icon: Warehouse,
                permission: 'inventory.stock.read',
            },
            {
                label: 'أرصدة المخزون',
                href: '/inventory/stock',
                icon: Boxes,
                permission: 'inventory.stock.read',
            },
            {
                label: 'حركات المخزون',
                href: '/inventory/movements',
                icon: ArrowDownUp,
                permission: 'inventory.movements.read',
            },
            {
                label: 'العملاء',
                href: '/crm/customers',
                icon: HandshakeIcon,
                permission: 'crm.customers.read',
            },
            {
                label: 'الموردين',
                href: '/purchases/suppliers',
                icon: Building2,
                permission: 'purchases.suppliers.read',
            },
            {
                label: 'الموظفين والمناديب',
                href: '/hr/employees',
                icon: UserCircle2,
                permission: 'hr.employees.read',
            },
        ],
    },
    {
        label: 'العمليات',
        items: [
            {
                label: 'المبيعات',
                href: '/sales',
                icon: ShoppingCart,
                permission: 'sales.orders.read',
            },
            {
                label: 'المشتريات',
                href: '/purchases',
                icon: Truck,
                permission: 'purchases.orders.read',
            },
            {
                label: 'المالية',
                href: '/finance',
                icon: DollarSign,
                permission: 'finance.accounts.read',
            },
        ],
    },
    {
        label: 'الأداء',
        items: [
            {
                label: 'المندوبين',
                href: '/reps',
                icon: MapPin,
                permission: 'reps.visits.read',
            },
            {
                label: 'الأهداف',
                href: '/targets',
                icon: Target,
                permission: 'targets.targets.read',
            },
            {
                label: 'العمولات',
                href: '/commissions',
                icon: Award,
                permission: 'commissions.schemes.read',
            },
        ],
    },
    {
        label: 'النظام',
        items: [
            {
                label: 'التقارير',
                href: '/reports',
                icon: BarChart3,
                permission: 'reports.reports.read',
            },
            {
                label: 'المستخدمين',
                href: '/settings/users',
                icon: Users,
                permission: 'auth.users.read',
            },
            {
                label: 'الأدوار والصلاحيات',
                href: '/settings/roles',
                icon: Shield,
                permission: 'auth.roles.read',
            },
            {
                label: 'الأقسام',
                href: '/settings/departments',
                icon: Building2,
                permission: 'auth.departments.read',
            },
            {
                label: 'سجل التدقيق',
                href: '/settings/audit-log',
                icon: FileText,
                permission: 'settings.audit.read',
            },
            {
                label: 'الإعدادات',
                href: '/settings',
                icon: Settings,
                permission: 'settings.general.read',
            },
            {
                label: 'شركات الشحن',
                href: '/settings/shipping',
                icon: Truck,
                permission: 'settings.shipping.read',
            },
        ],
    },
]
