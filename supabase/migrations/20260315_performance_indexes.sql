-- ============================================================
-- EDARA — Performance & Optimization Script (Idempotent)
-- يمكن تشغيل هذا الملف عدة مرات بأمان
-- آخر تحديث: 2026-03-13
-- ============================================================

BEGIN;

-- ============================================================
-- 1. تفعيل إضافة pg_trgm للبحث النصي السريع
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. Indexes إضافية — تكمل ما تم في Phase 1 و Phase 2
-- ============================================================
-- ملاحظة: الفهارس الأساسية موجودة بالفعل في Phase 1/2
-- هنا نضيف فقط فهارس trigram للبحث السريع
-- وفهارس مركبة وجزئية (partial) لم تكن موجودة

-- ── Customers: بحث نصي سريع بـ trigram ──
-- Phase 2 أنشأ idx_customers_name بـ to_tsvector('arabic', name) — trigram أسرع لـ ILIKE
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone) WHERE phone IS NOT NULL;

-- ── Products: بحث نصي سريع بـ trigram ──
-- Phase 2 أنشأ idx_products_name بـ to_tsvector — trigram أسرع لـ ILIKE
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- ── Suppliers: بحث نصي سريع بـ trigram ──
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON suppliers USING gin (name gin_trgm_ops);

-- ── Profiles: بحث نصي سريع بالاسم ──
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON profiles USING gin (full_name gin_trgm_ops);

-- ── Stock: فهرس مركب (product + warehouse) لتسريع JOINs ──
-- Phase 2 أنشأ idx_stock_product و idx_stock_warehouse بشكل منفصل
-- الفهرس المركب يسرع استعلامات البحث بالمنتج والمخزن معاً
CREATE INDEX IF NOT EXISTS idx_stock_composite ON stock (product_id, warehouse_id);

-- ── Stock Movements: الفهرس بالتاريخ تنازلي لعرض آخر الحركات ──
-- Phase 2 أنشأ idx_movements_created — هنا اسم مختلف مع DESC
CREATE INDEX IF NOT EXISTS idx_stock_movements_date_desc ON stock_movements (created_at DESC);

-- ── Audit Log: فهارس إضافية (Phase 1 أنشأت الأساسية) ──
-- لا حاجة لإضافة فهارس — Phase 1 يغطي كل المطلوب

-- ── Future Tables (شرطية — تُنشأ فقط إذا كان الجدول موجود) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_date ON orders (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments (customer_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (created_at DESC)';
  END IF;
END $$;

-- ============================================================
-- 3. RPC Functions — عمليات حرجة server-side
-- ============================================================

-- 3.1 عدد المنتجات منخفضة المخزون (بدلاً من client-side filter)
-- يستخدم في: DashboardPage → getDashboardStats()
CREATE OR REPLACE FUNCTION get_low_stock_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(count(*)::integer, 0)
  FROM stock s
  JOIN products p ON s.product_id = p.id
  WHERE s.quantity > 0
    AND p.min_stock > 0
    AND s.quantity <= p.min_stock;
$$;

-- 3.2 بحث الموظفين بالاسم server-side (بدلاً من client-side filter)
-- يستخدم في: hr.ts → getEmployees()
CREATE OR REPLACE FUNCTION search_employees(
  p_search text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  employee_code text,
  department_id uuid,
  job_title text,
  hire_date date,
  salary numeric,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text,
  department_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    e.id,
    e.profile_id,
    e.employee_code,
    e.department_id,
    e.job_title,
    e.hire_date,
    e.salary,
    e.is_active,
    e.created_at,
    e.updated_at,
    pr.full_name,
    d.name AS department_name
  FROM employees e
  LEFT JOIN profiles pr ON e.profile_id = pr.id
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE
    (p_department_id IS NULL OR e.department_id = p_department_id)
    AND (p_is_active IS NULL OR e.is_active = p_is_active)
    AND (
      p_search IS NULL
      OR pr.full_name ILIKE '%' || p_search || '%'
      OR e.employee_code ILIKE '%' || p_search || '%'
      OR e.job_title ILIKE '%' || p_search || '%'
    )
  ORDER BY e.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
$$;

-- 3.3 عدد الموظفين (مع فلاتر)
-- يستخدم في: hr.ts → getEmployees() للعدد الإجمالي
CREATE OR REPLACE FUNCTION count_employees(
  p_search text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(count(*)::integer, 0)
  FROM employees e
  LEFT JOIN profiles pr ON e.profile_id = pr.id
  WHERE
    (p_department_id IS NULL OR e.department_id = p_department_id)
    AND (p_is_active IS NULL OR e.is_active = p_is_active)
    AND (
      p_search IS NULL
      OR pr.full_name ILIKE '%' || p_search || '%'
      OR e.employee_code ILIKE '%' || p_search || '%'
      OR e.job_title ILIKE '%' || p_search || '%'
    );
$$;

-- ============================================================
-- 4. Grant Permissions
-- ============================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_low_stock_count() TO authenticated;
GRANT EXECUTE ON FUNCTION search_employees(text, uuid, boolean, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION count_employees(text, uuid, boolean) TO authenticated;

COMMIT;
