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
    Undo2,
    Tag,
    Landmark,
    Wallet,
    Receipt,
    CreditCard,
    BookOpen,
    GitBranch,
    ClipboardCheck,
    PackageCheck,
    Calendar,
    ShieldCheck,
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
                permission: 'reports.dashboards.read',
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
        label: 'المبيعات',
        items: [
            {
                label: 'أوامر البيع',
                href: '/sales',
                icon: ShoppingCart,
                permission: 'sales.orders.read',
            },
            {
                label: 'مرتجعات المبيعات',
                href: '/sales/returns',
                icon: Undo2,
                permission: 'sales.returns.read',
            },
            {
                label: 'قواعد الخصم',
                href: '/sales/discounts',
                icon: Tag,
                permission: 'sales.discounts.manage',
            },
            {
                label: 'إثباتات الدفع',
                href: '/sales/payment-proofs',
                icon: ClipboardCheck,
                permission: 'finance.collections.read',
            },
        ],
    },
    {
        label: 'المشتريات',
        items: [
            {
                label: 'أوامر الشراء',
                href: '/purchases',
                icon: Truck,
                permission: 'purchases.orders.read',
            },
            {
                label: 'إذون الاستلام',
                href: '/purchases/receipts',
                icon: PackageCheck,
                permission: 'purchases.receipts.read',
            },
            {
                label: 'مرتجعات المشتريات',
                href: '/purchases/returns',
                icon: Undo2,
                permission: 'purchases.returns.read',
            },
        ],
    },
    {
        label: 'المالية',
        items: [
            {
                label: 'الخزائن',
                href: '/finance/vaults',
                icon: Landmark,
                permission: 'finance.vaults.read',
            },
            {
                label: 'العهد',
                href: '/finance/custody',
                icon: Wallet,
                permission: 'finance.custody.read',
            },
            {
                label: 'المصروفات',
                href: '/finance/expenses',
                icon: Receipt,
                permission: 'finance.expenses.read',
            },
            {
                label: 'تحصيل العملاء',
                href: '/finance/customer-payments',
                icon: CreditCard,
                permission: 'finance.collections.read',
            },
            {
                label: 'سداد الموردين',
                href: '/finance/supplier-payments',
                icon: CreditCard,
                permission: 'finance.payments.read',
            },
            {
                label: 'شجرة الحسابات',
                href: '/finance/accounts',
                icon: GitBranch,
                permission: 'finance.accounts.read',
            },
            {
                label: 'القيود المحاسبية',
                href: '/finance/journal',
                icon: BookOpen,
                permission: 'finance.entries.read',
            },
            {
                label: 'الفترات المحاسبية',
                href: '/finance/fiscal-periods',
                icon: Calendar,
                permission: 'finance.settings.manage',
            },
            {
                label: 'قواعد الاعتماد',
                href: '/finance/approval-rules',
                icon: ShieldCheck,
                permission: 'finance.settings.manage',
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
                label: 'الفروع',
                href: '/settings/branches',
                icon: Building2,
                permission: 'settings.general.read',
            },
            {
                label: 'التقسيم الجغرافي',
                href: '/settings/geography',
                icon: MapPin,
                permission: 'settings.general.read',
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
