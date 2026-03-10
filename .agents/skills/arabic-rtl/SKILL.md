---
description: Arabic RTL layout patterns and internationalization for EDARA
---

# Arabic RTL Specialist Skill

## Role
You are an **Arabic RTL & i18n Specialist**. You ensure the entire EDARA system renders correctly in Arabic RTL and supports bilingual content.

## Font — Cairo (MANDATORY)

EDARA uses **Cairo** from Google Fonts — the top-rated Arabic font for enterprise UIs.

```css
--font-sans: 'Cairo', system-ui, -apple-system, sans-serif;
```

### Typography Rules
- Body text: **15px** minimum (Arabic appears smaller than Latin at same px)
- Line height: **1.7** for body, **1.3** for headings
- Weights: 400 (body), 600 (semibold labels), 700 (bold headings)
- **Never** use weight 800+ for Arabic — connected letterforms become hard to read
- **Never** use italic for Arabic text

## Fundamental RTL Rules

### 1. Document Direction
```html
<html lang="ar" dir="rtl">
```

### 2. CSS Logical Properties (ALWAYS use these)
```css
/* ❌ WRONG — physical properties */
margin-left: 16px;
padding-right: 8px;
text-align: left;

/* ✅ CORRECT — logical properties */
margin-inline-start: 16px;
padding-inline-end: 8px;
text-align: start;
```

### 3. Flexbox & Grid
```css
/* These auto-flip in RTL — no changes needed */
display: flex;
gap: 16px;
justify-content: flex-start; /* Becomes right-aligned in RTL */
```

### 4. Icons That Must Flip
- Arrows (→ ←)
- Chevrons (‹ ›)
- Reply/forward icons
- Navigation arrows
- Progress indicators

```css
[dir="rtl"] .icon-directional {
  transform: scaleX(-1);
}
```

### 5. Numbers & Dates
- **Numbers**: Always Western Arabic numerals (0-9) — NOT Eastern (٠-٩)
- **Currency**: "ج.م 1,500.00" (suffix in Arabic)
- **Dates**: DD/MM/YYYY format
- **Phone numbers**: Always LTR within RTL context
```css
.phone-number, .ltr-content {
  direction: ltr;
  unicode-bidi: embed;
}
```

### 6. LTR Fields in RTL Forms
Email, password, phone, and code fields must have `dir="ltr"`:
```tsx
<input type="email" dir="ltr" className="form-input" />
<input type="password" dir="ltr" className="form-input" />
<input type="tel" dir="ltr" className="form-input" />
```

## Dark Mode — CSS Variables (NOT Tailwind dark:)

> [!CAUTION]
> **NEVER** use Tailwind `dark:` prefix for backgrounds, text, or borders.
> EDARA uses CSS custom properties that auto-switch. See `/design-rules` workflow for full guide.

Quick reference:
```tsx
// ✅ CORRECT
<div className="edara-card">...</div>
<h1 style={{ color: 'var(--text-primary)' }}>عنوان</h1>
<div style={{ borderColor: 'var(--divider-color)' }}>...</div>

// ❌ WRONG
<div className="bg-white dark:bg-surface-800">...</div>
<h1 className="text-surface-900 dark:text-white">...</h1>
```

## Common RTL Gotchas
1. **Shadows**: CSS shadows don't flip — adjust manually
2. **Border-radius**: Use logical `border-start-start-radius` etc.
3. **Background positions**: Use logical keywords
4. **Scroll**: Scrollbar appears on left in RTL
5. **Charts**: Labels and legends need RTL consideration
6. **Tables**: Header alignment should be `text-align: start`

## Company Settings — Currency & Formatting

> [!IMPORTANT]
> **NEVER** hardcode currency or company details. Read from `company_settings` table.
> See `/design-rules` workflow Section 7 for full details.

```tsx
// ✅ CORRECT — currency from settings
const currency = settings.find(s => s.key === 'default_currency')?.value || 'EGP'
const formatted = `${amount.toLocaleString('ar-EG')} ${currency}`

// ❌ WRONG — hardcoded
const formatted = `${amount} ج.م`
```
