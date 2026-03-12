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
          { path: '/settings/users', element: <UsersPage /> },
          { path: '/settings/roles', element: <RolesPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/departments', element: <DepartmentsPage /> },
          { path: '/settings/audit-log', element: <AuditLogPage /> },
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/products/categories', element: <CategoriesPage /> },
          { path: '/products/price-lists', element: <PriceListsPage /> },
          { path: '/products/units', element: <UnitsPage /> },
          { path: '/products/brands', element: <BrandsPage /> },
          { path: '/inventory', element: <WarehousesPage /> },
          { path: '/inventory/stock', element: <StockPage /> },
          { path: '/inventory/movements', element: <StockMovementsPage /> },
          { path: '/crm/customers', element: <CustomersPage /> },
          { path: '/crm/customers/:id', element: <CustomerDetailPage /> },
          { path: '/purchases/suppliers', element: <SuppliersPage /> },
          { path: '/purchases/suppliers/:id', element: <SupplierDetailPage /> },
          { path: '/hr/employees', element: <EmployeesPage /> },
          { path: '/hr/employees/:id', element: <EmployeeDetailPage /> },
          { path: '/settings/shipping', element: <ShippingCompaniesPage /> },
          { path: '/profile', element: <ProfilePage /> },
          // Coming Soon — modules under development
          { path: '/sales', element: <ComingSoonPage /> },
          { path: '/purchases', element: <ComingSoonPage /> },
          { path: '/finance', element: <ComingSoonPage /> },
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
