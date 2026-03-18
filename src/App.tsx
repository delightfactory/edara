import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ProtectedRoute, GuestRoute } from '@/components/guards/RouteGuards'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { UsersPage } from '@/pages/settings/UsersPage'
import { RolesPage } from '@/pages/settings/RolesPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { DepartmentsPage } from '@/pages/settings/DepartmentsPage'
import { AuditLogPage } from '@/pages/settings/AuditLogPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { CategoriesPage } from '@/pages/products/CategoriesPage'
import { PriceListsPage } from '@/pages/products/PriceListsPage'
import { WarehousesPage } from '@/pages/inventory/WarehousesPage'
import { StockPage } from '@/pages/inventory/StockPage'
import { StockMovementsPage } from '@/pages/inventory/StockMovementsPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage'
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage'
import { SupplierDetailPage } from '@/pages/suppliers/SupplierDetailPage'
import { EmployeesPage } from '@/pages/hr/EmployeesPage'
import { EmployeeDetailPage } from '@/pages/hr/EmployeeDetailPage'
import { UnitsPage } from '@/pages/products/UnitsPage'
import { BrandsPage } from '@/pages/products/BrandsPage'
import { ShippingCompaniesPage } from '@/pages/settings/ShippingCompaniesPage'
import { ProfilePage } from '@/pages/settings/ProfilePage'
import { ProductDetailPage } from '@/pages/products/ProductDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { Toaster } from 'sonner'

// Phase 3 — Sales
import { SalesOrdersPage } from '@/pages/sales/SalesOrdersPage'
import { SalesOrderFormPage } from '@/pages/sales/SalesOrderFormPage'
import { SalesOrderDetailPage } from '@/pages/sales/SalesOrderDetailPage'
import { SalesReturnsPage } from '@/pages/sales/SalesReturnsPage'
import { SalesReturnFormPage } from '@/pages/sales/SalesReturnFormPage'
import { DiscountRulesPage } from '@/pages/sales/DiscountRulesPage'
import { PaymentProofsPage } from '@/pages/sales/PaymentProofsPage'

// Phase 3 — Purchases
import { PurchaseOrdersPage } from '@/pages/purchases/PurchaseOrdersPage'
import { PurchaseOrderFormPage } from '@/pages/purchases/PurchaseOrderFormPage'
import { PurchaseReceiptsPage } from '@/pages/purchases/PurchaseReceiptsPage'
import { PurchaseReceiptFormPage } from '@/pages/purchases/PurchaseReceiptFormPage'
import { PurchaseReturnsPage } from '@/pages/purchases/PurchaseReturnsPage'
import { PurchaseReturnFormPage } from '@/pages/purchases/PurchaseReturnFormPage'
import { PurchaseOrderDetailPage } from '@/pages/purchases/PurchaseOrderDetailPage'

// Phase 3 — Finance
import { VaultsPage } from '@/pages/finance/VaultsPage'
import { CustodyPage } from '@/pages/finance/CustodyPage'
import { ExpensesPage } from '@/pages/finance/ExpensesPage'
import { CustomerPaymentsPage } from '@/pages/finance/CustomerPaymentsPage'
import { SupplierPaymentsPage } from '@/pages/finance/SupplierPaymentsPage'
import { ChartOfAccountsPage } from '@/pages/finance/ChartOfAccountsPage'
import { JournalEntriesPage } from '@/pages/finance/JournalEntriesPage'
import { FiscalPeriodsPage } from '@/pages/finance/FiscalPeriodsPage'
import { ApprovalRulesPage } from '@/pages/finance/ApprovalRulesPage'

// Phase 3 — Settings
import { BranchesPage } from '@/pages/settings/BranchesPage'
import { GeographyPage } from '@/pages/settings/GeographyPage'

const router = createBrowserRouter([
  // Guest routes (login)
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  // Protected routes (dashboard)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          // Settings
          { path: '/settings/users', element: <UsersPage /> },
          { path: '/settings/roles', element: <RolesPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/departments', element: <DepartmentsPage /> },
          { path: '/settings/audit-log', element: <AuditLogPage /> },
          { path: '/settings/shipping', element: <ShippingCompaniesPage /> },
          { path: '/settings/branches', element: <BranchesPage /> },
          { path: '/profile', element: <ProfilePage /> },
          // Products
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/products/categories', element: <CategoriesPage /> },
          { path: '/products/price-lists', element: <PriceListsPage /> },
          { path: '/products/units', element: <UnitsPage /> },
          { path: '/products/brands', element: <BrandsPage /> },
          // Inventory
          { path: '/inventory', element: <WarehousesPage /> },
          { path: '/inventory/stock', element: <StockPage /> },
          { path: '/inventory/movements', element: <StockMovementsPage /> },
          // CRM
          { path: '/crm/customers', element: <CustomersPage /> },
          { path: '/crm/customers/:id', element: <CustomerDetailPage /> },
          // Suppliers
          { path: '/purchases/suppliers', element: <SuppliersPage /> },
          { path: '/purchases/suppliers/:id', element: <SupplierDetailPage /> },
          // HR
          { path: '/hr/employees', element: <EmployeesPage /> },
          { path: '/hr/employees/:id', element: <EmployeeDetailPage /> },
          // Sales — Phase 3
          { path: '/sales', element: <SalesOrdersPage /> },
          { path: '/sales/new', element: <SalesOrderFormPage /> },
          { path: '/sales/:id', element: <SalesOrderDetailPage /> },
          { path: '/sales/returns', element: <SalesReturnsPage /> },
          { path: '/sales/returns/new', element: <SalesReturnFormPage /> },
          { path: '/sales/discounts', element: <DiscountRulesPage /> },
          { path: '/sales/payment-proofs', element: <PaymentProofsPage /> },
          // Purchases — Phase 3
          { path: '/purchases', element: <PurchaseOrdersPage /> },
          { path: '/purchases/new', element: <PurchaseOrderFormPage /> },
          { path: '/purchases/:id', element: <PurchaseOrderDetailPage /> },
          { path: '/purchases/receipts', element: <PurchaseReceiptsPage /> },
          { path: '/purchases/receipts/new', element: <PurchaseReceiptFormPage /> },
          { path: '/purchases/returns', element: <PurchaseReturnsPage /> },
          { path: '/purchases/returns/new', element: <PurchaseReturnFormPage /> },
          // Finance — Phase 3
          { path: '/finance/vaults', element: <VaultsPage /> },
          { path: '/finance/custody', element: <CustodyPage /> },
          { path: '/finance/expenses', element: <ExpensesPage /> },
          { path: '/finance/customer-payments', element: <CustomerPaymentsPage /> },
          { path: '/finance/supplier-payments', element: <SupplierPaymentsPage /> },
          { path: '/finance/accounts', element: <ChartOfAccountsPage /> },
          { path: '/finance/journal', element: <JournalEntriesPage /> },
          { path: '/finance/fiscal-periods', element: <FiscalPeriodsPage /> },
          { path: '/finance/approval-rules', element: <ApprovalRulesPage /> },
          // Geography
          { path: '/settings/geography', element: <GeographyPage /> },
          // Coming Soon — modules under development
          { path: '/reps', element: <ComingSoonPage /> },
          { path: '/targets', element: <ComingSoonPage /> },
          { path: '/commissions', element: <ComingSoonPage /> },
          { path: '/reports', element: <ComingSoonPage /> },
          // 404 catch-all
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-left"
          dir="rtl"
          toastOptions={{
            className: 'font-sans',
            style: {
              fontFamily: "'Cairo', system-ui, sans-serif",
            },
          }}
        />
      </AuthProvider>
    </QueryProvider>
  )
}
