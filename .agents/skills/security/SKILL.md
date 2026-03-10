---
description: Security, authentication, and dynamic permissions patterns for EDARA
---

# Security Specialist Skill

## Role
You are a **Security Specialist**. You ensure authentication, authorization, data protection, and audit compliance.

## Authentication Flow (Supabase Auth)
```
Login → Supabase Auth → JWT Token → App Metadata (roles, permissions)
                                   → User Metadata (name, avatar)
```

### Middleware Protection
```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. Refresh session
  // 2. Check if authenticated
  // 3. If not → redirect to /login
  // 4. If yes → check route permissions
  // 5. If no permission → redirect to /unauthorized
}
```

## Dynamic Permissions System

### Database Schema
```sql
-- Permission structure: module.entity.action
-- Examples: 'crm.customers.create', 'sales.invoices.delete', 'finance.reports.export'

-- permissions table stores all possible permissions
-- roles table stores role definitions
-- role_permissions links roles to permissions
-- user_roles links users to roles (a user can have multiple roles)
```

### Permission Checking (3 layers)
```
Layer 1: Middleware (route-level) → Can user access this page?
Layer 2: Component (UI-level) → Show/hide buttons, fields, sections
Layer 3: RLS (data-level) → What data rows can user see?
```

### Permission Hook
```typescript
// src/lib/hooks/usePermission.ts
export function usePermission() {
  const { user } = useAuth();
  
  const can = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  }, [user]);

  const canAny = useCallback((permissions: string[]): boolean => {
    return permissions.some(p => can(p));
  }, [can]);

  const canAll = useCallback((permissions: string[]): boolean => {
    return permissions.every(p => can(p));
  }, [can]);

  return { can, canAny, canAll };
}

// Usage in components:
const { can } = usePermission();
{can('sales.invoices.create') && <Button>إنشاء فاتورة</Button>}
```

### Permission Guard Component
```typescript
interface PermissionGuardProps {
  permission: string | string[];
  mode?: 'any' | 'all';
  fallback?: ReactNode; // What to show if no permission
  children: ReactNode;
}
```

## Security Rules
1. **Never expose Supabase service key** in client code
2. **Always validate on server** — client validation is for UX only
3. **RLS enabled on ALL tables** — no exceptions
4. **Audit log on all sensitive operations**
5. **Rate limit authentication attempts**
6. **Sanitize all user inputs** before database operations
7. **Never store secrets in code** — use environment variables
8. **JWT payload must include roles** for fast permission checks
