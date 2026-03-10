-- ============================================================
-- EDARA — المرحلة 1: البنية التحتية والأساسات
-- Migration: Phase 01 Foundation
-- Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. CUSTOM TYPES (ENUMs)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
  END IF;
END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add department_id column (safe for re-run on existing table)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN department_id UUID;
  END IF;
END $$;

COMMENT ON TABLE public.profiles IS 'ملفات المستخدمين - تمتد من auth.users';

-- 3.2 Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.departments IS 'الأقسام والإدارات';

-- Add FK from profiles.department_id to departments now that both tables exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profiles_department'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_department
      FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.3 Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  parent_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roles IS 'الأدوار - قابلة للتخصيص مع وراثة';

-- 3.4 Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module TEXT NOT NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module, entity, action)
);

COMMENT ON TABLE public.permissions IS 'الصلاحيات - module.entity.action';

-- 3.5 Role-Permission mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE public.role_permissions IS 'ربط الأدوار بالصلاحيات';

-- 3.6 User-Role mapping
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

COMMENT ON TABLE public.user_roles IS 'تعيين المستخدمين للأدوار';

-- 3.7 Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS 'سجل التدقيق لكل العمليات';

-- 3.8 Company Settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.company_settings IS 'إعدادات الشركة والنظام';

-- 3.9 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'إشعارات المستخدمين';

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_module_entity ON public.permissions(module, entity);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_company_settings_key ON public.company_settings(key);

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- 5.1 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Audit log trigger function
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to get the current user
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), v_user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Auto-create profile on signup
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Get all permissions for a user (including inherited from parent roles)
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  v_permissions TEXT[];
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user has super_admin role
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND r.name = 'super_admin'
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ) INTO v_is_super_admin;

  -- Super admin gets wildcard
  IF v_is_super_admin THEN
    RETURN ARRAY['*'];
  END IF;

  -- Get all permissions from user's roles (including parent roles)
  WITH RECURSIVE role_tree AS (
    -- Direct user roles
    SELECT r.id, r.parent_role_id
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND (ur.expires_at IS NULL OR ur.expires_at > now())

    UNION ALL

    -- Parent roles (inheritance)
    SELECT r.id, r.parent_role_id
    FROM public.roles r
    JOIN role_tree rt ON r.id = rt.parent_role_id
  )
  SELECT ARRAY_AGG(DISTINCT p.module || '.' || p.entity || '.' || p.action)
  INTO v_permissions
  FROM role_tree rt
  JOIN public.role_permissions rp ON rp.role_id = rt.id
  JOIN public.permissions p ON p.id = rp.permission_id;

  RETURN COALESCE(v_permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 Check single permission
CREATE OR REPLACE FUNCTION check_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_perms TEXT[];
BEGIN
  v_perms := get_user_permissions(p_user_id);
  RETURN '*' = ANY(v_perms) OR p_permission = ANY(v_perms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6 Update last_login_at on sign-in (called from Edge Function or trigger)
CREATE OR REPLACE FUNCTION fn_update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-update timestamps
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_departments_updated ON public.departments;
CREATE TRIGGER trg_departments_updated
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_roles_updated ON public.roles;
CREATE TRIGGER trg_roles_updated
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_company_settings_updated ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Audit trails on sensitive tables
DROP TRIGGER IF EXISTS trg_roles_audit ON public.roles;
CREATE TRIGGER trg_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_role_permissions_audit ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_user_roles_audit ON public.user_roles;
CREATE TRIGGER trg_user_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Audit trail on profile status changes
DROP TRIGGER IF EXISTS trg_profiles_audit ON public.profiles;
CREATE TRIGGER trg_profiles_audit
  AFTER UPDATE OF is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- Update last_login on sign-in
DROP TRIGGER IF EXISTS trg_on_auth_user_login ON auth.users;
CREATE TRIGGER trg_on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_update_last_login();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users see all active profiles, update only their own
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Admins can update any profile (via Edge Function uses service_role, but
-- this policy covers direct admin access if needed)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'auth.users.update'));

-- Departments: readable by all, writable by admins
DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "departments_insert" ON public.departments;
CREATE POLICY "departments_insert" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'auth.departments.create'));

DROP POLICY IF EXISTS "departments_update" ON public.departments;
CREATE POLICY "departments_update" ON public.departments
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'auth.departments.update'));

DROP POLICY IF EXISTS "departments_delete" ON public.departments;
CREATE POLICY "departments_delete" ON public.departments
  FOR DELETE TO authenticated
  USING (check_permission(auth.uid(), 'auth.departments.delete'));

-- Roles: readable by all authenticated, writable by admins
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "roles_modify" ON public.roles;

DROP POLICY IF EXISTS "roles_insert" ON public.roles;
CREATE POLICY "roles_insert" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'auth.roles.create'));

DROP POLICY IF EXISTS "roles_update" ON public.roles;
CREATE POLICY "roles_update" ON public.roles
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'auth.roles.update'));

DROP POLICY IF EXISTS "roles_delete" ON public.roles;
CREATE POLICY "roles_delete" ON public.roles
  FOR DELETE TO authenticated
  USING (check_permission(auth.uid(), 'auth.roles.delete') AND is_system = false);

-- Permissions: readable by all authenticated
DROP POLICY IF EXISTS "permissions_select" ON public.permissions;
CREATE POLICY "permissions_select" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- Role-Permissions: readable by all, writable by admins
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "role_permissions_modify" ON public.role_permissions;
CREATE POLICY "role_permissions_modify" ON public.role_permissions
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'auth.roles.update'))
  WITH CHECK (check_permission(auth.uid(), 'auth.roles.update'));

-- User-Roles: readable by all, writable by admins
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_roles_modify" ON public.user_roles;
CREATE POLICY "user_roles_modify" ON public.user_roles
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'auth.users.update'))
  WITH CHECK (check_permission(auth.uid(), 'auth.users.update'));

-- Audit Log: readable by admins only
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'settings.audit.read'));

-- Allow audit_log inserts from SECURITY DEFINER triggers
-- Note: fn_audit_log runs as SECURITY DEFINER so it bypasses RLS.
-- No INSERT policy needed for the trigger, but adding one for transparency.
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Company Settings: readable by all, writable by admins
DROP POLICY IF EXISTS "company_settings_select" ON public.company_settings;
CREATE POLICY "company_settings_select" ON public.company_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "company_settings_modify" ON public.company_settings;
CREATE POLICY "company_settings_modify" ON public.company_settings
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'settings.general.update'))
  WITH CHECK (check_permission(auth.uid(), 'settings.general.update'));

-- Notifications: users see only their own
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Allow system (service_role triggers/functions) to insert notifications
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'auth.users.update'));

-- ============================================================
-- 8. SEED DATA: Default Roles
-- ============================================================
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('super_admin', 'مدير النظام', 'صلاحيات كاملة على كل النظام', true),
  ('admin', 'مسؤول', 'صلاحيات إدارية واسعة', true),
  ('manager', 'مدير', 'مدير قسم أو فرع', true),
  ('supervisor', 'مشرف', 'مشرف فريق مبيعات', true),
  ('sales_rep', 'مندوب مبيعات', 'مندوب مبيعات ميداني', true),
  ('accountant', 'محاسب', 'مسؤول حسابات ومالية', true),
  ('warehouse_keeper', 'أمين مخزن', 'مسؤول المخازن والمستودعات', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- ============================================================
-- 9. SEED DATA: Permissions (all planned modules)
-- ============================================================
INSERT INTO public.permissions (module, entity, action, display_name) VALUES
  -- Auth module
  ('auth', 'users', 'create', 'إنشاء مستخدم'),
  ('auth', 'users', 'read', 'عرض المستخدمين'),
  ('auth', 'users', 'update', 'تعديل مستخدم'),
  ('auth', 'users', 'delete', 'حذف مستخدم'),
  ('auth', 'roles', 'create', 'إنشاء دور'),
  ('auth', 'roles', 'read', 'عرض الأدوار'),
  ('auth', 'roles', 'update', 'تعديل دور'),
  ('auth', 'roles', 'delete', 'حذف دور'),
  ('auth', 'departments', 'create', 'إنشاء قسم'),
  ('auth', 'departments', 'read', 'عرض الأقسام'),
  ('auth', 'departments', 'update', 'تعديل قسم'),
  ('auth', 'departments', 'delete', 'حذف قسم'),
  -- Products module
  ('products', 'products', 'create', 'إنشاء منتج'),
  ('products', 'products', 'read', 'عرض المنتجات'),
  ('products', 'products', 'update', 'تعديل منتج'),
  ('products', 'products', 'delete', 'حذف منتج'),
  ('products', 'products', 'export', 'تصدير المنتجات'),
  ('products', 'categories', 'create', 'إنشاء تصنيف'),
  ('products', 'categories', 'read', 'عرض التصنيفات'),
  ('products', 'categories', 'update', 'تعديل تصنيف'),
  ('products', 'categories', 'delete', 'حذف تصنيف'),
  ('products', 'prices', 'create', 'إنشاء قائمة أسعار'),
  ('products', 'prices', 'read', 'عرض الأسعار'),
  ('products', 'prices', 'update', 'تعديل الأسعار'),
  ('products', 'prices', 'approve', 'اعتماد تغيير الأسعار'),
  -- Inventory module
  ('inventory', 'stock', 'read', 'عرض المخزون'),
  ('inventory', 'stock', 'update', 'تعديل المخزون'),
  ('inventory', 'movements', 'read', 'عرض الحركات'),
  ('inventory', 'transfers', 'create', 'إنشاء تحويل'),
  ('inventory', 'transfers', 'approve', 'اعتماد تحويل'),
  ('inventory', 'adjustments', 'create', 'إنشاء تسوية'),
  ('inventory', 'adjustments', 'approve', 'اعتماد تسوية'),
  ('inventory', 'counts', 'create', 'إنشاء جرد'),
  ('inventory', 'counts', 'approve', 'اعتماد جرد'),
  -- CRM module
  ('crm', 'customers', 'create', 'إنشاء عميل'),
  ('crm', 'customers', 'read', 'عرض العملاء'),
  ('crm', 'customers', 'update', 'تعديل عميل'),
  ('crm', 'customers', 'delete', 'حذف عميل'),
  ('crm', 'customers', 'export', 'تصدير العملاء'),
  -- Sales module
  ('sales', 'orders', 'create', 'إنشاء أمر بيع'),
  ('sales', 'orders', 'read', 'عرض أوامر البيع'),
  ('sales', 'orders', 'update', 'تعديل أمر بيع'),
  ('sales', 'orders', 'approve', 'اعتماد أمر بيع'),
  ('sales', 'invoices', 'create', 'إنشاء فاتورة'),
  ('sales', 'invoices', 'read', 'عرض الفواتير'),
  ('sales', 'invoices', 'update', 'تعديل فاتورة'),
  ('sales', 'invoices', 'approve', 'اعتماد فاتورة'),
  ('sales', 'invoices', 'export', 'تصدير الفواتير'),
  ('sales', 'returns', 'create', 'إنشاء مرتجع'),
  ('sales', 'returns', 'read', 'عرض المرتجعات'),
  ('sales', 'returns', 'approve', 'اعتماد مرتجع'),
  -- Purchases module
  ('purchases', 'orders', 'create', 'إنشاء أمر شراء'),
  ('purchases', 'orders', 'read', 'عرض أوامر الشراء'),
  ('purchases', 'orders', 'approve', 'اعتماد أمر شراء'),
  ('purchases', 'receipts', 'create', 'إنشاء إذن استلام'),
  ('purchases', 'receipts', 'read', 'عرض إذون الاستلام'),
  ('purchases', 'invoices', 'create', 'إنشاء فاتورة مورد'),
  ('purchases', 'invoices', 'read', 'عرض فواتير الموردين'),
  -- Finance module
  ('finance', 'accounts', 'create', 'إنشاء حساب'),
  ('finance', 'accounts', 'read', 'عرض شجرة الحسابات'),
  ('finance', 'accounts', 'update', 'تعديل حساب'),
  ('finance', 'entries', 'create', 'إنشاء قيد'),
  ('finance', 'entries', 'read', 'عرض القيود'),
  ('finance', 'entries', 'approve', 'ترحيل قيد'),
  ('finance', 'collections', 'create', 'تسجيل تحصيل'),
  ('finance', 'collections', 'read', 'عرض التحصيلات'),
  ('finance', 'payments', 'create', 'تسجيل سداد'),
  ('finance', 'payments', 'read', 'عرض المسددات'),
  ('finance', 'reports', 'read', 'عرض التقارير المالية'),
  ('finance', 'reports', 'export', 'تصدير التقارير المالية'),
  ('finance', 'periods', 'manage', 'إدارة الفترات المحاسبية'),
  -- Reps module
  ('reps', 'visits', 'create', 'تسجيل زيارة'),
  ('reps', 'visits', 'read', 'عرض الزيارات'),
  ('reps', 'routes', 'create', 'إنشاء مسار'),
  ('reps', 'routes', 'read', 'عرض المسارات'),
  ('reps', 'routes', 'update', 'تعديل مسار'),
  ('reps', 'tracking', 'read', 'تتبع المندوبين'),
  -- Targets module
  ('targets', 'targets', 'create', 'إنشاء هدف'),
  ('targets', 'targets', 'read', 'عرض الأهداف'),
  ('targets', 'targets', 'update', 'تعديل هدف'),
  ('targets', 'achievements', 'read', 'عرض الإنجازات'),
  -- Commissions module
  ('commissions', 'schemes', 'create', 'إنشاء نظام عمولات'),
  ('commissions', 'schemes', 'read', 'عرض أنظمة العمولات'),
  ('commissions', 'schemes', 'update', 'تعديل نظام عمولات'),
  ('commissions', 'calculations', 'read', 'عرض حسابات العمولات'),
  ('commissions', 'calculations', 'approve', 'اعتماد العمولات'),
  -- HR module
  ('hr', 'employees', 'create', 'إنشاء موظف'),
  ('hr', 'employees', 'read', 'عرض الموظفين'),
  ('hr', 'employees', 'update', 'تعديل موظف'),
  ('hr', 'attendance', 'read', 'عرض الحضور'),
  ('hr', 'attendance', 'manage', 'إدارة الحضور'),
  ('hr', 'leaves', 'create', 'طلب إجازة'),
  ('hr', 'leaves', 'approve', 'اعتماد إجازة'),
  ('hr', 'payroll', 'read', 'عرض الرواتب'),
  ('hr', 'payroll', 'manage', 'إدارة الرواتب'),
  -- Reports module
  ('reports', 'reports', 'read', 'عرض التقارير'),
  ('reports', 'reports', 'export', 'تصدير التقارير'),
  ('reports', 'dashboards', 'read', 'عرض لوحات القيادة'),
  -- Settings module
  ('settings', 'general', 'read', 'عرض الإعدادات'),
  ('settings', 'general', 'update', 'تعديل الإعدادات'),
  ('settings', 'audit', 'read', 'عرض سجل التدقيق')
ON CONFLICT (module, entity, action) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- ============================================================
-- 10. SEED: Assign all permissions to admin role
-- ============================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- 11. SEED: Default company settings
-- ============================================================
INSERT INTO public.company_settings (key, value, category) VALUES
  ('company_name', 'شركة التوزيع', 'general'),
  ('company_phone', '', 'general'),
  ('company_email', '', 'general'),
  ('company_address', '', 'general'),
  ('company_tax_number', '', 'general'),
  ('default_currency', 'EGP', 'financial'),
  ('fiscal_year_start', '01-01', 'financial'),
  ('default_payment_terms', 'cash', 'sales'),
  ('credit_limit_check', 'true', 'sales'),
  ('min_margin_percent', '10', 'sales'),
  ('require_price_approval', 'true', 'sales'),
  ('auto_generate_customer_code', 'true', 'crm'),
  ('visit_reminder_days', '14', 'crm'),
  ('gps_required_for_visits', 'true', 'reps'),
  ('max_rows_per_page', '50', 'system')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value;
