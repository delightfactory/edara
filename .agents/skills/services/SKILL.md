---
description: Service layer patterns, data access, and API design for EDARA modules
---

# Service Layer Specialist Skill

## Role
You are a **Service Layer Architect**. You build the data access and business logic layer between Supabase and React components.

## Service File Structure

Each module has ONE service file: `src/lib/services/[module].ts`

```typescript
// src/lib/services/customers.ts
import { createClient } from '@/lib/supabase/client';
import type { Customer, CustomerFilters, PaginatedResult } from '@/lib/types/customers';

// ============================================================
// QUERIES (Read Operations)
// ============================================================

export async function getCustomers(
  filters: CustomerFilters
): Promise<PaginatedResult<Customer>> {
  const supabase = createClient();
  
  let query = supabase
    .from('customers')
    .select('*, customer_contacts(*)', { count: 'exact' })
    .is('deleted_at', null);

  // Apply filters
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.type) {
    query = query.eq('customer_type', filters.type);
  }
  if (filters.rep_id) {
    query = query.eq('assigned_rep_id', filters.rep_id);
  }

  // Pagination (ALWAYS server-side, ALWAYS limit)
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query.range(from, to);

  // Sorting
  query = query.order(filters.sortBy || 'created_at', {
    ascending: filters.sortDirection === 'asc'
  });

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data as Customer[],
    total: count || 0,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil((count || 0) / filters.pageSize),
  };
}

export async function getCustomerById(id: string): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      customer_contacts(*),
      customer_addresses(*),
      assigned_rep:profiles!assigned_rep_id(id, full_name),
      invoices(id, total_amount, status, created_at)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Customer;
}

// ============================================================
// MUTATIONS (Write Operations)
// ============================================================

export async function createCustomer(
  input: CustomerCreateInput
): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

// ============================================================
// RPC (Complex Operations)
// ============================================================

export async function getCustomerSummary(customerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('fn_customer_summary', {
    p_customer_id: customerId
  });
  if (error) throw error;
  return data;
}
```

## Patterns

### Always Use Server-Side Pagination
```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BaseFilters {
  page: number;
  pageSize: number; // Max 50
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}
```

### React Query Integration
```typescript
// src/lib/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => getCustomers(filters),
    staleTime: 30_000, // 30 seconds
    placeholderData: keepPreviousData,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
```

### Error Handling
```typescript
import { PostgrestError } from '@supabase/supabase-js';

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: PostgrestError
  ) {
    super(message);
  }
}

// Wrap Supabase errors with user-friendly Arabic messages
function handleError(error: PostgrestError): never {
  const messages: Record<string, string> = {
    '23505': 'هذا العنصر موجود بالفعل',
    '23503': 'لا يمكن الحذف - مرتبط ببيانات أخرى',
    '42501': 'ليس لديك صلاحية لهذا الإجراء',
  };
  throw new ServiceError(
    messages[error.code] || 'حدث خطأ غير متوقع',
    error.code, error
  );
}
```

## Rules
1. **Never return all rows** — always paginate
2. **Use RPC for aggregations** — never calculate in JS
3. **Include `deleted_at IS NULL`** in all queries (soft delete)
4. **Type everything** — no `any` types ever
5. **One service file per module** — keep organized
6. **Invalidate related caches** on mutations
7. **Handle errors with Arabic messages**
