---
description: Reusable UI component patterns, design system, and best practices for EDARA
---

# UI Components Specialist Skill

## Role
You are a **UI Component Specialist**. You build reusable, accessible, performant, premium-quality components for the EDARA system.

## Design System Foundation

### Color Palette (CSS Variables)
```css
:root {
  /* Brand Colors */
  --primary: 222.2 47.4% 11.2%;      /* Deep navy */
  --primary-foreground: 210 40% 98%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* Semantic Colors */
  --success: 142.1 76.2% 36.3%;
  --warning: 38 92% 50%;
  --destructive: 0 84.2% 60.2%;
  --info: 217.2 91.2% 59.8%;
  
  /* Surface Colors for glassmorphism */
  --glass: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
}
```

### Typography (Google Fonts)
- **Primary Arabic**: `IBM Plex Sans Arabic` (weights: 300, 400, 500, 600, 700)
- **Monospace/Numbers**: `IBM Plex Mono`
- **Base size**: 14px, **Scale**: 1.25 (Major Third)

### Spacing Scale
`4px | 8px | 12px | 16px | 20px | 24px | 32px | 40px | 48px | 64px`

## Component Architecture

### Shared Components (`src/components/shared/`)

#### DataTable — Core data display component
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSortChange: (sort: SortingState) => void;
  onSearch: (search: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;         // Slot for custom filters
  actions?: ReactNode;         // Slot for action buttons
  bulkActions?: ReactNode;     // Slot for bulk action buttons
  isLoading?: boolean;
  emptyState?: ReactNode;
  exportable?: boolean;
}
```
- Uses TanStack Table for logic
- Server-side pagination + sorting (ALWAYS)
- Skeleton loading rows during fetch
- Responsive: card view on mobile, table on desktop
- RTL-aware column alignment

#### FormSheet — Slide-over form panel
```typescript
interface FormSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

#### StatCard — KPI display cards
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; direction: 'up' | 'down' };
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  loading?: boolean;
}
```

#### StatusBadge — Consistent status display
```typescript
interface StatusBadgeProps {
  status: string;
  statusConfig: Record<string, { label: string; color: string; icon?: LucideIcon }>;
}
```

#### ConfirmDialog — Action confirmation
```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}
```

#### PageHeader — Consistent page headers
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs: { label: string; href?: string }[];
  actions?: ReactNode;
}
```

## Component Rules

### 1. Loading States (MANDATORY)
Every component that fetches data MUST have:
- Skeleton loading state (not spinners)
- Error state with retry action
- Empty state with helpful message + action

### 2. Transitions & Animations
```css
/* Standard transition */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Page transitions */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Stagger children */
.stagger > * {
  animation: fadeIn 300ms ease-out both;
}
.stagger > *:nth-child(n) {
  animation-delay: calc(n * 50ms);
}
```

### 3. RTL Design
- Use `gap` instead of margins between siblings
- Use logical properties: `padding-inline-start`, `margin-inline-end`
- Icons with direction (arrows, chevrons) must flip
- Tables: text-align `start` not `left`

### 4. Responsive Breakpoints
```css
/* Mobile first */
@media (min-width: 640px) { /* sm: tablets */ }
@media (min-width: 768px) { /* md: small laptops */ }
@media (min-width: 1024px) { /* lg: desktops */ }
@media (min-width: 1280px) { /* xl: large screens */ }
```

### 5. Form Components
- Use React Hook Form + Zod for ALL forms
- Inline validation with Arabic error messages
- Auto-save drafts for complex forms
- Step indicators for multi-step forms (wizards)

## Mobile Patterns
- Bottom sheets instead of dialogs on mobile
- Swipe gestures for list item actions
- Pull-to-refresh on list pages
- Floating Action Button for primary action
- Bottom navigation for main sections
