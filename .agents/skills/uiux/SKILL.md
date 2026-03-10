---
description: UI/UX excellence patterns, premium design, and user experience best practices for EDARA
---

# UI/UX Specialist Skill

## Role
You are a **UI/UX Design Specialist**. You ensure every screen in EDARA delivers a premium, intuitive, modern experience.

## Design Philosophy
1. **The system guides the user** — not the other way around
2. **Information hierarchy** — most important data is most visible
3. **Reduce cognitive load** — smart defaults, progressive disclosure
4. **Instant feedback** — every action has visible response
5. **Delight through details** — micro-animations, smooth transitions

## Page Layout Patterns

### Dashboard Pages (Overview)
```
┌─────────────────────────────────────────────┐
│ Page Header (title + breadcrumbs + actions)  │
├──────────┬──────────┬──────────┬────────────┤
│ StatCard │ StatCard │ StatCard │ StatCard   │
├──────────┴──────────┴──────────┴────────────┤
│ Charts Row (2-3 charts side by side)        │
├─────────────────────┬───────────────────────┤
│ Recent Activity     │ Alerts / Tasks        │
└─────────────────────┴───────────────────────┘
```

### List Pages (CRUD)
```
┌─────────────────────────────────────────────┐
│ PageHeader (title + "إضافة جديد" button)    │
├──────────┬──────────┬──────────┬────────────┤
│ StatCard │ StatCard │ StatCard │ StatCard   │
├──────────┴──────────┴──────────┴────────────┤
│ Search + Filters + Export                    │
├─────────────────────────────────────────────┤
│ DataTable (server-paginated)                │
│ ┌──┬──────┬────────┬────────┬───────────┐  │
│ │☐ │ الاسم │ النوع  │ الحالة │ إجراءات  │  │
│ ├──┼──────┼────────┼────────┼───────────┤  │
│ │  │ ...  │  ...   │ Badge  │ ⋮ Menu    │  │
│ └──┴──────┴────────┴────────┴───────────┘  │
│          Pagination (prev/next + count)      │
└─────────────────────────────────────────────┘
```

### Detail Pages (View/Edit)
```
┌─────────────────────────────────────────────┐
│ PageHeader (name + status badge + actions)   │
├──────────┬──────────┬──────────┬────────────┤
│ Key Info │ Key Info │ Key Info │ Key Info   │
├──────────┴──────────┴──────────┴────────────┤
│ Tabs: [بيانات أساسية] [المعاملات] [السجل]   │
├─────────────────────────────────────────────┤
│ Tab Content Area                             │
└─────────────────────────────────────────────┘
```

## Interaction Patterns

### Toast Notifications
- **Success**: Green, auto-dismiss 3s, bottom-right (bottom-left in RTL)
- **Error**: Red, persistent until dismissed, with retry action
- **Warning**: Yellow, 5s auto-dismiss
- **Info**: Blue, 3s auto-dismiss

### Loading Strategy
```
Priority Order:
1. Skeleton → Shows layout structure (PREFERRED)
2. Shimmer → For cards and images
3. Spinner → ONLY for action buttons during submission
4. Progress bar → For file uploads and long operations
```

### Empty States
Every empty state MUST include:
- Relevant illustration or icon
- Descriptive message in Arabic
- Primary action button (e.g., "أضف أول عميل")

### Form UX
- **Inline validation** — validate on blur, show error below field
- **Smart defaults** — pre-fill common values
- **Auto-focus** first field on form open
- **Unsaved changes warning** when navigating away
- **Success animation** after submission

## Color Usage Guide

| Context | Usage |
|---------|-------|
| Primary actions | Brand primary color |
| Success/positive | Green (confirmed orders, paid invoices) |
| Warning/attention | Amber (pending, expiring) |
| Error/destructive | Red (delete, overdue, failed) |
| Info/neutral | Blue (informational, draft) |
| Muted/disabled | Gray (inactive, cancelled) |

## Motion & Animation Rules
- **Duration**: 150ms for micro, 300ms for transitions, 500ms for page
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for standard
- **Never animate** layout-causing properties on scroll
- **Reduce motion**: Respect `prefers-reduced-motion`

## Mobile-Specific Rules
- Minimum touch target: 44×44px
- Bottom sheet instead of dialog for actions
- Swipe left/right on list items for quick actions
- Sticky headers on scroll
- Collapsible sections for dense information
