-- ============================================================
-- Permissions Completeness Fix
-- Adds missing permissions for field-level access,
-- warehouse management, and employee deletion
-- ============================================================

-- ── 1. New permissions ──────────────────────────────────────
INSERT INTO public.permissions (module, entity, action, display_name) VALUES
  -- Field-level: product cost
  ('products', 'costs', 'read', 'عرض سعر التكلفة وهامش الربح'),
  ('products', 'costs', 'update', 'تعديل سعر التكلفة'),
  -- Inventory: stock creation (used in code but missing from DB)
  ('inventory', 'stock', 'create', 'إنشاء حركة مخزون'),
  -- Inventory: warehouse management
  ('inventory', 'warehouses', 'create', 'إنشاء مخزن'),
  ('inventory', 'warehouses', 'read', 'عرض المخازن'),
  ('inventory', 'warehouses', 'update', 'تعديل مخزن'),
  ('inventory', 'warehouses', 'delete', 'حذف مخزن'),
  -- HR: employee deletion
  ('hr', 'employees', 'delete', 'حذف موظف')
ON CONFLICT (module, entity, action) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- ── 2. Assign new permissions to admin role ─────────────────
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND (
    (p.module = 'products' AND p.entity = 'costs')
    OR (p.module = 'inventory' AND p.entity = 'stock' AND p.action = 'create')
    OR (p.module = 'inventory' AND p.entity = 'warehouses')
    OR (p.module = 'hr' AND p.entity = 'employees' AND p.action = 'delete')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── 3. Reload PostgREST schema cache ────────────────────────
NOTIFY pgrst, 'reload schema';
