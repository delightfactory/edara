---
description: Design rules and UI standards for EDARA — mandatory for all components
---

# EDARA Design Rules & Standards

// turbo-all

## 1. Font — Cairo

EDARA uses **Cairo** from Google Fonts — the #1 Arabic font for enterprise UIs.
- Body text: `15px` (Arabic glyphs appear smaller than Latin)
- Line height: `1.7` for body, `1.3` for headings  
- Weights: 400 (regular), 600 (semibold), 700 (bold) — avoid 800+ for Arabic
- Font stack: `'Cairo', system-ui, -apple-system, sans-serif`

## 2. Dark Mode — CSS Variables (MANDATORY)

> [!CAUTION]
> **NEVER** use Tailwind `dark:` prefix for backgrounds, text, or borders.
> It does NOT reliably work with Tailwind v4's `@layer utilities`.
> **ALWAYS** use CSS custom properties that auto-switch.

### How It Works
Variables defined in `:root` (light) and `.dark` (dark) in `index.css`:

```css
:root {
  --card-bg: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --divider-color: #e2e8f0;
  --body-bg: #f1f5f9;
}
.dark {
  --card-bg: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --divider-color: rgba(51,65,85,0.6);
  --body-bg: #0f172a;
}
```

### Usage in Components

#### Card Backgrounds — use `edara-card` class
```tsx
// ✅ CORRECT — auto-switches
<div className="edara-card p-5">...</div>

// ❌ WRONG — does NOT switch
<div className="card p-5">only if card class uses CSS vars</div>
<div className="bg-white dark:bg-surface-800">Tailwind dark: is unreliable</div>
```

#### Text Colors — use inline style with CSS variable
```tsx
// ✅ CORRECT
<h1 style={{ color: 'var(--text-primary)' }}>العنوان</h1>
<p style={{ color: 'var(--text-secondary)' }}>الوصف</p>
<span style={{ color: 'var(--text-muted)' }}>ملاحظة</span>

// ❌ WRONG
<h1 className="text-surface-900 dark:text-white">Unreliable</h1>
```

#### Borders & Dividers — use inline style or component class
```tsx
// ✅ CORRECT
<div style={{ borderBottom: '1px solid var(--divider-color)' }}>...</div>
<div className="edara-divider" />

// ❌ WRONG
<div className="border-surface-200 dark:border-surface-700">Unreliable</div>
```

#### Modal Backgrounds — use inline CSS variable
```tsx
// ✅ CORRECT
<div style={{ backgroundColor: 'var(--card-bg)' }}>...</div>

// ❌ WRONG
<div className="bg-white dark:bg-surface-800">Unreliable</div>
```

#### Overlays — use `edara-overlay` class
```tsx
<div className="edara-overlay" onClick={onClose} />
```

### Available Component Classes
| Class | Purpose |
|---|---|
| `edara-card` | Card with auto-switching bg, border, shadow, rounded-2xl |
| `edara-empty` | Empty state placeholder with dashed border |
| `edara-overlay` | Modal/drawer backdrop with blur |
| `edara-thead` | Table header row background |
| `edara-tr-hover` | Table row hover effect |
| `edara-divider` | Horizontal divider (1px) |

### Labels — use inline style
```tsx
<label style={{ color: 'var(--text-secondary)' }}>الحقل</label>
```

## 3. Responsive Design (MANDATORY)

### Breakpoints
```
sm:  640px   (large phones)
md:  768px   (tablets)
lg:  1024px  (small desktops)
xl:  1280px  (desktops)
```

### Grid Layouts
- Stats: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Two-panel: `grid-cols-1 lg:grid-cols-[320px_1fr]`
- NEVER use fixed widths without responsive overrides

### Padding & Spacing
- Main content: `p-4 sm:p-6`
- Card padding: `p-4 sm:p-5`
- Section gaps: `gap-4 sm:gap-6`

### Tables
- Wrap in `overflow-x-auto` container
- Use `min-w-[600px]` on table for horizontal scroll on mobile

### Modals
- Always use `p-4` wrapper for mobile safe area
- Max width: `max-w-lg`
- Content should scroll: `max-h-[80vh] overflow-y-auto`

## 4. Component Patterns

### Buttons
```
btn btn-primary      — gradient indigo, shadow, hover lift
btn btn-secondary    — transparent + border
btn btn-danger       — gradient red
btn btn-ghost        — transparent, hover bg
btn-sm / btn-lg      — size variants
```

### Badges
```
badge badge-primary   — indigo
badge badge-success   — green
badge badge-danger    — red
badge badge-warning   — amber
```

### Form Inputs — `form-input` class
Already provides: full width, border, radius, focus ring, dark mode via CSS vars.

### Page Headers
```tsx
<div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
        <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
    </div>
    <div>
        <h1 className="page-title">العنوان</h1>
        <p className="page-subtitle">الوصف</p>
    </div>
</div>
```

### Modal Headers — gradient style
```tsx
<div className="bg-gradient-to-l from-primary-600 to-primary-700 px-6 py-5 text-white">
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-lg font-bold">العنوان</h2>
                <p className="text-xs text-primary-200 mt-0.5">الوصف</p>
            </div>
        </div>
        <CloseButton />
    </div>
</div>
```

### Loading States
```tsx
<div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="h-10 w-10 animate-spin rounded-full border-3"
         style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--color-primary-600)' }} />
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>جاري التحميل...</p>
</div>
```

### Empty States
```tsx
<div className="edara-empty flex flex-col items-center gap-3 py-20">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
         style={{ backgroundColor: 'var(--empty-bg)' }}>
        <Icon className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
    </div>
    <p className="font-medium" style={{ color: 'var(--text-muted)' }}>لا توجد بيانات</p>
</div>
```

## 5. RTL & Arabic Rules
- Always `dir="rtl"` on `<html>`
- Phone/email/password fields: add `dir="ltr"`
- Numbers: Western Arabic (0-9), never Eastern (٠-٩)
- Dates: DD/MM/YYYY with Arabic locale

## 6. Animation
- Page enter: `animate-[fade-in_0.4s_ease-out]`
- Modal enter: `animate-[scale-in_0.2s_ease-out]`
- Table rows: staggered `style={{ animationDelay: '${index * 40}ms', animation: 'fade-in 0.3s ease-out backwards' }}`
- Hover transitions: `transition-all duration-200`

## 7. Company Settings Integration (MANDATORY)

> [!IMPORTANT]
> **ALWAYS** read and use values from the `company_settings` table instead of hardcoding.
> Use `getCompanySettings()` from `src/lib/services/settings.ts` to retrieve settings.

### Settings Available
| Key | Usage |
|---|---|
| `default_currency` | All monetary values — invoices, reports, POS, payments |
| `company_name` | Headers, reports, print layouts, receipts |
| `company_phone` | Contact info, print layouts |
| `company_email` | Contact info, notifications |
| `company_address` | Invoices, reports |
| `company_tax_number` | Tax invoices, fiscal reports |
| `fiscal_year_start` | Financial reports, P&L, balance sheet |
| `default_payment_terms` | Invoice defaults, customer terms |
| `credit_limit_check` | Sales module — enable/disable credit check |
| `min_margin_percent` | Sales pricing validation |
| `require_price_approval` | Sales workflow — manager approval |
| `auto_generate_customer_code` | CRM auto-numbering |
| `visit_reminder_days` | CRM visit scheduling |
| `gps_required_for_visits` | Rep tracking enforcement |
| `max_rows_per_page` | Pagination defaults across all tables |

### Usage Pattern
```tsx
// Create a hook or utility to get a specific setting
const settings = await getCompanySettings()
const currency = settings.find(s => s.key === 'default_currency')?.value || 'EGP'

// Format currency everywhere
const formatCurrency = (amount: number) => `${amount.toLocaleString('ar-EG')} ${currency}`
```

### Rules
1. **NEVER** hardcode currency symbols — always read from `default_currency`
2. **NEVER** hardcode company name — always read from `company_name`
3. **NEVER** hardcode pagination limits — always read from `max_rows_per_page`
4. **ALWAYS** add new settings to `company_settings` table when adding new configurable features
5. **ALWAYS** update `keyLabels` in `SettingsPage.tsx` and `categoryConfig` when adding settings

## 8. Action Buttons Pattern

### Table Row Actions — Use Inline Buttons
```tsx
// ✅ CORRECT — visible, discoverable
<div className="flex items-center gap-1">
    <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-50" title="تعديل">
        <Pencil className="h-3.5 w-3.5 text-surface-400" />
    </button>
    <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-danger/10" title="حذف">
        <Trash2 className="h-3.5 w-3.5 text-surface-400" />
    </button>
</div>

// ❌ WRONG — hidden behind dropdown, poor discoverability
<MoreVertical /> → dropdown menu
```

### Page Header Actions
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <PageHeader />
    <button className="btn btn-primary">
        <Plus className="h-4 w-4" />
        إضافة جديد
    </button>
</div>
```

## 9. Dynamic Permissions (MANDATORY)

> [!CAUTION]
> **EVERY** page, button, field, and navigation link MUST respect the user's permissions.
> Use `useAuthStore()` hooks — NEVER show actions the user cannot perform.

### Permission Naming Convention
```
module.entity.action
```
Examples:
- `auth.users.read` — view users list
- `auth.users.create` — add new user
- `auth.users.update` — edit user
- `auth.users.delete` — delete/deactivate user
- `sales.orders.read` — view orders
- `finance.accounts.read` — view financial accounts

### Permission API (from `useAuthStore`)
```tsx
const { can, canAny, canAll } = useAuthStore()

can('auth.users.create')           // single permission check
canAny(['sales.orders.read', 'sales.orders.create'])  // any of these
canAll(['finance.accounts.read', 'finance.reports.read']) // all of these
```

> `*` permission = super admin — `can()` returns `true` for everything.

### Where to Apply Permissions

#### 1. Navigation — auto-filtered in Sidebar
```tsx
// navigation.ts — each item has optional permission
{ label: 'المستخدمين', href: '/settings/users', icon: Users, permission: 'auth.users.read' }
```
Sidebar already filters: `group.items.filter(item => !item.permission || can(item.permission))`

#### 2. Page-level — guard entire pages
```tsx
const { can } = useAuthStore()
if (!can('auth.users.read')) return <NoPermissionPage />
```

#### 3. Action Buttons — hide/disable based on permission
```tsx
// ✅ CORRECT — conditionally render
{can('auth.users.create') && (
    <button className="btn btn-primary">إضافة مستخدم</button>
)}

// ✅ ALSO OK — disable with visual hint
<button disabled={!can('auth.users.update')} className="btn btn-primary">
    تعديل
</button>

// ❌ WRONG — showing actions without permission check
<button className="btn btn-primary">إضافة مستخدم</button>
```

#### 4. Inline Row Actions
```tsx
<div className="flex items-center gap-1">
    {can('auth.users.update') && (
        <button onClick={onEdit} title="تعديل"><Pencil /></button>
    )}
    {can('auth.users.delete') && (
        <button onClick={onDelete} title="حذف"><Trash2 /></button>
    )}
</div>
```

#### 5. Form Fields — read-only for view-only users
```tsx
<input
    type="text"
    value={value}
    readOnly={!can('module.entity.update')}
    className="form-input"
/>
```

### Rules
1. **Navigation**: Sidebar filters by `permission` field — always set it on NavItems
2. **Pages**: Always check `can('module.entity.read')` at page level
3. **Create buttons**: Guard with `can('module.entity.create')`
4. **Edit/Update**: Guard with `can('module.entity.update')`
5. **Delete/Deactivate**: Guard with `can('module.entity.delete')`
6. **Backend**: RLS policies are the ultimate enforcement — UI is a UX layer only
7. **New modules**: MUST define permissions in the migration and register them in `permissions` table
