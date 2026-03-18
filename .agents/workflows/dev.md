---
description: Module development step-by-step workflow for EDARA
---

# Module Development Workflow

## Overview
This workflow defines the EXACT steps to follow when developing any module in the EDARA system. Every module MUST follow these steps in order.

// turbo-all

## Steps

### Phase A: Planning (Before Writing Code)

1. **Review the implementation plan** — Read `docs/ROADMAP.md` and `implementation_plan.md` for the module being developed. Identify ALL features, sub-features, and edge cases. Cross-reference with `docs/SYSTEM_BLUEPRINT.md` for business process details.

2. **Review existing infrastructure** — Check ALL existing database tables, types, services, and components to avoid duplication and ensure integration.

3. **Identify dependencies** — List other modules this module depends on or integrates with. Ensure those dependencies exist.

### Phase B: Database Layer

4. **Design the schema** — Write the migration SQL in the phase migration file (`supabase/migrations/YYYYMMDD_phase_XX_*.sql`). Include:
   - Tables with all columns, constraints, defaults
   - Indexes (single, composite, partial as needed)
   - ENUMs for status fields
   - Foreign keys with ON DELETE behavior
   - RLS policies
   - Audit triggers
   - Database functions for complex queries
   - Seed data if applicable

5. **Test the migration** — Run the migration twice to verify idempotency. Check in Supabase dashboard.

### Phase C: TypeScript Types

6. **Create type definitions** — in `src/lib/types/[module].ts`:
   - Database row types (matching schema exactly)
   - Input/create types (Omit<Row, auto-fields>)
   - Update types (Partial<CreateInput>)
   - Filter types with pagination
   - Enum types matching DB enums
   - Response types for complex queries

### Phase D: Service Layer

7. **Build service functions** — in `src/lib/services/[module].ts`:
   - CRUD operations with proper typing
   - Server-side pagination (max 50 per page)
   - Search and filter support
   - RPC calls for complex operations
   - Error handling with Arabic messages

8. **Build React Query hooks** — in `src/lib/hooks/use[Module].ts`:
   - Query hooks with proper cache keys
   - Mutation hooks with cache invalidation
   - Prefetching for anticipated navigation

### Phase E: Validation

9. **Create Zod schemas** — in `src/lib/validations/[module].ts`:
   - Create schemas matching service input types
   - Arabic error messages
   - Custom validators for business rules

### Phase F: UI Components

10. **Build module components** — in `src/components/modules/[module]/`:
    - List/table view component
    - Detail/view component  
    - Create/edit form component
    - Filter components
    - Any module-specific widgets
    - **MANDATORY**: All action buttons/links must be wrapped with `can()` permission checks

11. **Create/update shared components** if needed — ensure they remain generic.

### Phase G: Pages

12. **Build pages** — in `src/app/(dashboard)/[module]/`:
    - List page (with DataTable, filters, actions)
    - Detail page (with tabs for related data)
    - Any sub-pages
    - Proper loading.tsx and error.tsx files
    - **MANDATORY**: Page-level permission guard — check `can('module.entity.read')` at top

### Phase H: Verification

13. **Verify complete flow**:
    - Create, read, update, delete operations work
    - Pagination works with large data
    - Filters and search work correctly
    - **Permission checks work** (UI + RLS):
      - Buttons hidden for unauthorized users
      - Pages show "no permission" for unauthorized access
      - RLS policies block data at database level
    - RTL layout is correct
    - Mobile responsive design works
    - Loading and error states display properly
    - Integration with other modules works

14. **Performance check**:
    - Check query execution times
    - Verify indexes are being used
    - Test with realistic data volumes
    - No unnecessary re-renders

15. **Update task.md** — Mark module as complete, document any issues.

### Phase I: Settings Integration (MANDATORY)

16. **Verify company settings usage**:
    - All monetary values use `default_currency` from company settings — **NEVER hardcode**
    - All pagination uses `max_rows_per_page` from company settings
    - Company details (name, phone, email, address, tax number) are read from settings — used in headers, reports, print layouts
    - Financial settings (`fiscal_year_start`, `default_payment_terms`, `min_margin_percent`) are respected
    - Boolean settings (`credit_limit_check`, `require_price_approval`, `gps_required_for_visits`) are enforced
    - If the module introduces a new configurable feature, **add a new setting** to `company_settings` table
    - Update `SettingsPage.tsx` `keyLabels` and `categoryConfig` when adding new settings

### Phase J: Permissions Verification (MANDATORY)

> [!CAUTION]
> This phase MUST be completed before any module is considered done.
> Follow `/design-rules` Section 9 for full guidelines.

17. **DB Permissions**:
    - New permissions seeded in `permissions` table (`module.entity.action` format)
    - New permissions assigned to `admin` role via `role_permissions`

18. **Navigation permissions**:
    - Every nav item in `navigation.ts` has a `permission` field

19. **Page-level guards**:
    - Every page component checks `can('module.entity.read')` at top
    - Pages return "no permission" or redirect if check fails

20. **Action button permissions**:
    - Create button: `can('module.entity.create')`
    - Edit button: `can('module.entity.update')`
    - Delete button: `can('module.entity.delete')` — **NEVER** reuse `update` permission for delete

21. **Sensitive field-level permissions**:
    - Financial fields (cost_price, salary, commission, margins) use separate `module.field.read`
    - Form dialogs receive `canView`/`canEdit` props for sensitive fields
    - CSV/export excludes sensitive columns without permission
    - Table columns hide sensitive data without permission

22. **Separate vs shared permissions**:
    - Different operations (transfer vs adjustment) use distinct permission keys
    - Don't use generic permissions like `stock.create` when specific ones exist (`transfers.create`, `adjustments.create`)

### Phase K: Atomic Operations & Business Rules (MANDATORY for Sales/Purchases/Finance)

> [!CAUTION]
> ALL compound operations (confirm order, approve receipt, record payment, etc.) MUST be implemented as `plpgsql SECURITY DEFINER` functions — NEVER as client-side multi-step processes.

23. **Atomic DB functions**:
    - Every compound operation uses a single PostgreSQL function with `FOR UPDATE` row locks
    - Functions use `pg_advisory_xact_lock` for sequence generation (order numbers)
    - Pattern: validate → lock rows → update all related tables → create audit entries → return result
    - On any error, the entire transaction rolls back automatically

24. **Unit conversion enforcement**:
    - All inventory operations store `base_quantity = quantity × conversion_factor`
    - Stock table always tracks quantities in the base unit (e.g., pieces)
    - Display can use any unit; storage is ALWAYS in base unit
    - `product_units.conversion_factor` is the single source of truth

25. **Partial returns support**:
    - Return items link to `order_item_id` (original order item)
    - `quantity` on return item can be less than original order item quantity
    - Validation: `return_quantity ≤ original_quantity - already_returned_quantity`

26. **Credit management**:
    - `check_credit_limit()` called BEFORE confirming any credit sale
    - Formula: `current_balance + new_order_total ≤ credit_limit`
    - Overdue payments trigger `check_credit_violations()` which creates violations and notifications

27. **Approval workflows**:
    - `approval_rules` table defines max amounts per role/user
    - `can_approve(user_id, type, amount)` checks if user can approve given amount
    - If amount exceeds user's limit, auto-escalate to next approval level
    - Expenses, purchase orders, and discount overrides use this system

28. **Auto journal entries**:
    - Every financial operation (sale, purchase, payment, expense) auto-generates a journal entry
    - `auto_journal_entry(source_type, source_id)` creates debit/credit lines based on operation type
    - Users NEVER create journal entries manually (except accountant override)

