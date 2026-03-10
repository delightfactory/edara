---
description: Database design patterns, migration standards, and Supabase best practices for EDARA
---

# Database Specialist Skill

## Role
You are a **Database Architecture Specialist**. Your responsibility is designing robust, performant, and secure database schemas for the EDARA ERP/CRM system using Supabase (PostgreSQL).

## Migration File Standards

### Idempotent Pattern (MANDATORY)
Every migration MUST be safe to re-run. Use these patterns:

```sql
-- Tables: CREATE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columns: Add safely
DO $$ BEGIN
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Functions: CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$ BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Triggers: DROP + CREATE
DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- Indexes: CREATE IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- RLS: Enable + recreate policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (true);

-- Enums: Safe creation
DO $$ BEGIN
  CREATE TYPE public.customer_status AS ENUM ('active','inactive','blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum values: Add safely
DO $$ BEGIN
  ALTER TYPE public.customer_status ADD VALUE IF NOT EXISTS 'prospect';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Table Design Standards
- **UUID primary keys** — `gen_random_uuid()` default
- **Always include**: `id`, `created_at`, `updated_at`, `created_by`, `updated_by`
- **Soft delete**: `deleted_at TIMESTAMPTZ` (NULL = active)
- **Status fields**: Use PostgreSQL ENUMs
- **Money fields**: `NUMERIC(15,2)` — never FLOAT
- **Arabic text**: `TEXT` type (no VARCHAR limits)
- **Timestamps**: Always `TIMESTAMPTZ` (with timezone)
- **Foreign keys**: Always with `ON DELETE` behavior specified
- **Check constraints**: For business rules at DB level

### Indexing Strategy
```sql
-- Single column (most common lookups)
CREATE INDEX IF NOT EXISTS idx_[table]_[column] ON public.[table]([column]);

-- Composite (multi-column WHERE)
CREATE INDEX IF NOT EXISTS idx_[table]_[col1]_[col2] ON public.[table]([col1], [col2]);

-- Partial (filtered queries)
CREATE INDEX IF NOT EXISTS idx_[table]_active ON public.[table](status) WHERE deleted_at IS NULL;

-- GIN for JSONB
CREATE INDEX IF NOT EXISTS idx_[table]_meta ON public.[table] USING GIN(metadata);

-- Full text search (Arabic)
CREATE INDEX IF NOT EXISTS idx_[table]_search ON public.[table] USING GIN(to_tsvector('arabic', name));
```

### MUST INDEX these columns:
- All foreign keys
- `status` columns
- `created_at` (for date range queries)
- `deleted_at` (for soft delete filtering)
- Columns used in reports/dashboard aggregations
- Columns in ORDER BY of common queries

### RLS Policy Patterns
```sql
-- Tenant isolation (if multi-tenant)
CREATE POLICY "tenant_isolation" ON public.table_name
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- Role-based access
CREATE POLICY "admin_full_access" ON public.table_name
  USING (public.has_permission(auth.uid(), 'module.entity.action'));

-- Owner-only access
CREATE POLICY "own_data" ON public.table_name
  USING (created_by = auth.uid());

-- Hierarchical access (manager sees team data)
CREATE POLICY "team_data" ON public.table_name
  USING (
    created_by = auth.uid() OR
    created_by IN (SELECT id FROM public.get_subordinates(auth.uid()))
  );
```

### Audit Trail Pattern
```sql
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, new_data, user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Performance Critical Patterns
```sql
-- Pagination: Cursor-based for large datasets
CREATE OR REPLACE FUNCTION public.fn_get_customers_paginated(
  p_cursor UUID DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(...) AS $$
  SELECT * FROM public.customers
  WHERE deleted_at IS NULL
    AND (p_cursor IS NULL OR id < p_cursor)
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%')
  ORDER BY created_at DESC, id DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- Aggregation: Always at DB level
CREATE OR REPLACE FUNCTION public.fn_sales_summary(
  p_start_date DATE, p_end_date DATE
)
RETURNS TABLE(total_sales NUMERIC, total_orders BIGINT, avg_order NUMERIC) AS $$
  SELECT
    COALESCE(SUM(total_amount), 0),
    COUNT(*),
    COALESCE(AVG(total_amount), 0)
  FROM public.invoices
  WHERE invoice_date BETWEEN p_start_date AND p_end_date
    AND status = 'confirmed';
$$ LANGUAGE sql STABLE;
```

## Checklist Before Finalizing Schema
- [ ] All foreign keys have indexes
- [ ] All status columns have indexes
- [ ] All money columns use NUMERIC(15,2)
- [ ] All tables have created_at, updated_at, created_by
- [ ] Soft delete implemented where needed
- [ ] RLS enabled on all tables
- [ ] Audit triggers on all important tables
- [ ] Check constraints for business rules
- [ ] Database functions for complex queries
- [ ] No N+1 query patterns possible
