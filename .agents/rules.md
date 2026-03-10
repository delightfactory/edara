---
description: Global development rules and standards for the EDARA ERP/CRM system
---

# EDARA — Global Development Rules

## Project Overview
EDARA is a comprehensive ERP/CRM system for a car care products distribution company. Built with Next.js 14+ (App Router), Supabase, and Shadcn/UI. Arabic-first, RTL, deployed on Vercel.

## 🔴 Critical Rules (NEVER Violate)

### 1. Database Migration Rules
- **One migration file per development phase** — comprehensive and idempotent (safe to re-run)
- **All migrations MUST use `CREATE OR REPLACE`, `IF NOT EXISTS`, `DROP IF EXISTS` patterns**
- **Never create separate migration files for fixes** — modify the original phase migration file
- **Always test migration idempotency**: run it twice, second run must succeed with no errors
- **Migration file naming**: `YYYYMMDD_phase_XX_module_name.sql`
- **Every migration must include**: tables, indexes, RLS policies, triggers, functions, seed data

### 2. Development Order (STRICT)
For every feature or module, follow this EXACT order:
1. **Schema** → Design and write database tables, functions, triggers, RLS policies
2. **Types** → Generate/write TypeScript types matching the schema exactly
3. **Service Layer** → Build data access functions using Supabase client
4. **Components** → Build reusable UI components
5. **Pages** → Assemble pages using components
6. **Verification** → Test the complete flow

### 3. Performance Rules (HIGHEST PRIORITY)
- **NEVER load all rows** — always use server-side pagination (max 50 rows per request)
- **ALWAYS create database indexes** for columns used in WHERE, ORDER BY, JOIN
- **Use database-level aggregation** — never calculate totals/counts in JavaScript
- **Implement virtual scrolling** for lists exceeding 100 items
- **Use `React.memo`, `useMemo`, `useCallback`** for expensive computations
- **Lazy load** all module pages with `next/dynamic`
- **Use Supabase RPC** for complex queries instead of multiple round trips
- **Add composite indexes** for multi-column queries
- **Use database views** for complex, frequently-used queries
- **Monitor query execution plans** — no full table scans allowed

### 4. Component Design Rules
- **Reusable first** — every component must be designed for reuse across modules
- **Single Responsibility** — one component, one purpose
- **Props-driven** — components configured via props, not hardcoded
- **Any improvement to a shared component MUST reflect everywhere it is used**
- **Component categories**:
  - `ui/` — Base primitives (Button, Input, Dialog) from Shadcn
  - `shared/` — Business-agnostic reusable (DataTable, FormField, StatCard)
  - `modules/[name]/` — Module-specific compositions
- **Never duplicate component logic** — extract shared logic into hooks

### 5. UI/UX Excellence Rules
- **Premium design is MANDATORY** — no basic/generic styling
- **Every interaction must have feedback** (loading states, success/error toasts, transitions)
- **Mobile-first responsive design** — test on 375px, 768px, 1024px, 1440px
- **Arabic RTL is the PRIMARY direction** — never assume LTR
- **Consistent spacing, typography, and color** from the design system
- **Skeleton loaders** during data fetching — never show blank screens
- **Smooth transitions** between states and pages
- **Dark mode support** from the beginning
- **Accessibility**: proper ARIA labels, keyboard navigation, focus management

### 6. Full Infrastructure Utilization
- **Before implementing any feature**, review the database schema to use ALL relevant tables, columns, functions, and triggers
- **Cross-reference the implementation plan** before every module
- **Search for conflicts** before modifying any database object or shared component
- **Every database function, trigger, and view MUST be used** somewhere in the application
- **Log unused infrastructure** for cleanup

### 7. Library & Dependency Rules
- **Research before using any library** — check latest STABLE version
- **NEVER use beta, alpha, RC, or experimental packages**
- **Verify compatibility** with Next.js 14+, React 18+, and other deps
- **Prefer built-in solutions** over adding new dependencies
- **Document why each dependency is needed** in package.json comments or docs

## 📁 Project Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Public auth pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # Shadcn base components
│   ├── shared/            # Reusable business components
│   ├── layout/            # App layout (Sidebar, Header)
│   └── modules/           # Module-specific components
├── lib/
│   ├── supabase/          # Client, server client, middleware
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Data access / service layer
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── validations/       # Zod schemas
│   ├── constants/         # Enums and constants
│   └── permissions/       # Permission checking utilities
├── stores/                # Zustand state stores
└── i18n/                  # Translations (ar, en)
```

## 🔄 Workflow Per Module

1. Plan the module (review implementation_plan.md + gap_analysis.md)
2. Write/update migration SQL (idempotent, in phase migration file)
3. Run migration, verify in Supabase
4. Create TypeScript types in `lib/types/[module].ts`
5. Build service layer in `lib/services/[module].ts`
6. Create shared components if needed
7. Build module-specific components
8. Build pages
9. Test complete flow
10. Verify performance with large datasets

## 🌐 RTL & Internationalization
- Use `dir="rtl"` as default
- All text via `next-intl` translation keys
- Logical CSS properties: `margin-inline-start` not `margin-left`
- Icons: flip directional icons for RTL
- Tables: right-aligned by default for Arabic
