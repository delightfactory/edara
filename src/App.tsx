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
