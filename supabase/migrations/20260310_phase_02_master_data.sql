-- ============================================================
-- EDARA — المرحلة 2: البيانات الأساسية (Master Data)
-- Migration: Phase 02 Master Data
-- Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1. CUSTOM TYPES (ENUMs)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warehouse_type') THEN
    CREATE TYPE warehouse_type AS ENUM ('main', 'branch', 'van', 'scrap');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM (
      'purchase_in',    -- استلام مشتريات
      'sales_out',      -- صرف مبيعات
      'transfer_in',    -- تحويل وارد
      'transfer_out',   -- تحويل صادر
      'adjustment',     -- تسوية
      'return_in',      -- مرتجع عملاء
      'return_out',     -- مرتجع مشتريات
      'scrap',          -- إتلاف
      'initial'         -- رصيد افتتاحي
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
    CREATE TYPE customer_type AS ENUM ('retail', 'wholesale', 'service_center', 'car_wash', 'distributor', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_classification') THEN
    CREATE TYPE customer_classification AS ENUM ('A', 'B', 'C', 'D');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_terms_type') THEN
    CREATE TYPE payment_terms_type AS ENUM ('cash', 'credit_7', 'credit_15', 'credit_30', 'credit_45', 'credit_60', 'credit_90');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rep_type') THEN
    CREATE TYPE rep_type AS ENUM ('van_sales', 'pre_sales', 'delivery_driver');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_method') THEN
    CREATE TYPE delivery_method AS ENUM ('direct', 'company_van', 'shipping_company');
  END IF;
END $$;

-- ============================================================
-- 2. TABLES — المنتجات والكتالوج
-- ============================================================

-- 2.1 التصنيفات (هرمية)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS 'تصنيفات المنتجات - هرمية';

-- 2.2 العلامات التجارية
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.brands IS 'العلامات التجارية';

-- 2.3 وحدات القياس
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  base_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.units IS 'وحدات القياس (قطعة، كرتونة، لتر...)';

-- 2.4 المنتجات
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
  description TEXT,
  image_url TEXT,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  has_batches BOOLEAN NOT NULL DEFAULT false,
  requires_expiry BOOLEAN NOT NULL DEFAULT false,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS 'المنتجات — منتجات العناية بالسيارات والكيماويات';

-- 2.5 وحدات بديلة للمنتج
CREATE TABLE IF NOT EXISTS public.product_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  barcode TEXT,
  selling_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, unit_id)
);

COMMENT ON TABLE public.product_units IS 'وحدات بديلة لكل منتج (مثلاً كرتونة = 12 قطعة)';

-- 2.6 قوائم الأسعار
CREATE TABLE IF NOT EXISTS public.price_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.price_lists IS 'قوائم الأسعار (جملة، تجزئة، VIP...)';

-- 2.7 بنود قائمة الأسعار
CREATE TABLE IF NOT EXISTS public.price_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  min_qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, product_id, min_qty)
);

COMMENT ON TABLE public.price_list_items IS 'أسعار المنتجات ضمن كل قائمة سعر';

-- ============================================================
-- 3. TABLES — المخازن والمستودعات
-- ============================================================

-- 3.1 المستودعات
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  type warehouse_type NOT NULL DEFAULT 'main',
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_rep_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.warehouses IS 'المستودعات — main/branch/van/scrap';

-- 3.2 أرصدة المخزون (إجمالي)
CREATE TABLE IF NOT EXISTS public.stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

COMMENT ON TABLE public.stock IS 'أرصدة المخزون الإجمالية لكل منتج في كل مخزن';

-- 3.3 أرصدة التشغيلات (Batch tracking)
CREATE TABLE IF NOT EXISTS public.stock_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date DATE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id, batch_number)
);

COMMENT ON TABLE public.stock_batches IS 'أرصدة التشغيلات — تتبع الصلاحية (FEFO)';

-- 3.4 حركات المخزون
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  movement_type movement_type NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stock_movements IS 'حركات المخزون — كل عملية تُسجل هنا';

-- ============================================================
-- 4. TABLES — العملاء (CRM)
-- ============================================================

-- 4.1 العملاء
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  customer_type customer_type NOT NULL DEFAULT 'retail',
  classification customer_classification NOT NULL DEFAULT 'C',
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms payment_terms_type NOT NULL DEFAULT 'cash',
  tax_registration_number TEXT,
  default_delivery_method delivery_method NOT NULL DEFAULT 'direct',
  price_list_id UUID REFERENCES public.price_lists(id) ON DELETE SET NULL,
  assigned_rep_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customers IS 'العملاء — مراكز خدمة، مغاسل، تجزئة، جملة';

-- 4.2 جهات اتصال العملاء
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_contacts IS 'جهات اتصال العملاء';

-- 4.3 عناوين العملاء
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_addresses IS 'عناوين تسليم العملاء';

-- ============================================================
-- 5. TABLES — الموردين
-- ============================================================

-- 5.1 الموردين
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms payment_terms_type NOT NULL DEFAULT 'cash',
  is_manufacturer BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.suppliers IS 'الموردين والمصنّعين';

-- 5.2 جهات اتصال الموردين
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.supplier_contacts IS 'جهات اتصال الموردين';

-- 5.3 ربط مورد بعلامات تجارية
CREATE TABLE IF NOT EXISTS public.supplier_brands (
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, brand_id)
);

COMMENT ON TABLE public.supplier_brands IS 'العلامات التجارية التي يغطيها كل مورد';

-- ============================================================
-- 6. TABLES — الموظفين والمندوبين
-- ============================================================

-- 6.1 الموظفين
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_code TEXT UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  job_title TEXT,
  hire_date DATE,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

COMMENT ON TABLE public.employees IS 'بيانات الموظفين الإدارية';

-- 6.2 المندوبين
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  rep_type rep_type NOT NULL DEFAULT 'van_sales',
  territory TEXT,
  vehicle_type TEXT,
  max_customers INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

COMMENT ON TABLE public.sales_reps IS 'بيانات المندوبين — van_sales / pre_sales / delivery_driver';

-- ============================================================
-- 7. TABLES — شركات الشحن
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shipping_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shipping_companies IS 'شركات الشحن الخارجية';

-- ============================================================
-- 8. INDEXES
-- ============================================================

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- Brands
CREATE INDEX IF NOT EXISTS idx_brands_active ON public.brands(is_active);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING gin (to_tsvector('arabic', name));

-- Product Units
CREATE INDEX IF NOT EXISTS idx_product_units_product ON public.product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_product_units_barcode ON public.product_units(barcode);

-- Price Lists
CREATE INDEX IF NOT EXISTS idx_price_list_items_list ON public.price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product ON public.price_list_items(product_id);

-- Warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON public.warehouses(type);
CREATE INDEX IF NOT EXISTS idx_warehouses_rep ON public.warehouses(assigned_rep_id);

-- Stock
CREATE INDEX IF NOT EXISTS idx_stock_product ON public.stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON public.stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_low ON public.stock(quantity) WHERE quantity > 0;

-- Stock Batches
CREATE INDEX IF NOT EXISTS idx_stock_batches_product ON public.stock_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_warehouse ON public.stock_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_expiry ON public.stock_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_batches_qty ON public.stock_batches(quantity) WHERE quantity > 0;

-- Stock Movements
CREATE INDEX IF NOT EXISTS idx_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_ref ON public.stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON public.stock_movements(created_at DESC);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING gin (to_tsvector('arabic', name));
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_rep ON public.customers(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_classification ON public.customers(classification);

-- Customer contacts/addresses
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(is_active);

-- Supplier contacts
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON public.supplier_contacts(supplier_id);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_profile ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(is_active);

-- Sales Reps
CREATE INDEX IF NOT EXISTS idx_sales_reps_employee ON public.sales_reps(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_reps_type ON public.sales_reps(rep_type);
CREATE INDEX IF NOT EXISTS idx_sales_reps_active ON public.sales_reps(is_active);

-- Shipping Companies
CREATE INDEX IF NOT EXISTS idx_shipping_companies_active ON public.shipping_companies(is_active);

-- ============================================================
-- 9. TRIGGERS — Auto-update timestamps
-- ============================================================

DROP TRIGGER IF EXISTS trg_categories_updated ON public.categories;
CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_brands_updated ON public.brands;
CREATE TRIGGER trg_brands_updated
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_price_lists_updated ON public.price_lists;
CREATE TRIGGER trg_price_lists_updated
  BEFORE UPDATE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_price_list_items_updated ON public.price_list_items;
CREATE TRIGGER trg_price_list_items_updated
  BEFORE UPDATE ON public.price_list_items
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_warehouses_updated ON public.warehouses;
CREATE TRIGGER trg_warehouses_updated
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_stock_updated ON public.stock;
CREATE TRIGGER trg_stock_updated
  BEFORE UPDATE ON public.stock
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_stock_batches_updated ON public.stock_batches;
CREATE TRIGGER trg_stock_batches_updated
  BEFORE UPDATE ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_sales_reps_updated ON public.sales_reps;
CREATE TRIGGER trg_sales_reps_updated
  BEFORE UPDATE ON public.sales_reps
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_shipping_companies_updated ON public.shipping_companies;
CREATE TRIGGER trg_shipping_companies_updated
  BEFORE UPDATE ON public.shipping_companies
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- 10. TRIGGERS — Audit trails
-- ============================================================

DROP TRIGGER IF EXISTS trg_products_audit ON public.products;
CREATE TRIGGER trg_products_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_stock_movements_audit ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_audit
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_customers_audit ON public.customers;
CREATE TRIGGER trg_customers_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_suppliers_audit ON public.suppliers;
CREATE TRIGGER trg_suppliers_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_employees_audit ON public.employees;
CREATE TRIGGER trg_employees_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_warehouses_audit ON public.warehouses;
CREATE TRIGGER trg_warehouses_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all Phase 2 tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_companies ENABLE ROW LEVEL SECURITY;

-- ── Products module ──────────────────────────────────────────

-- Categories: read all, write with permission
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'products.categories.create'));

DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'products.categories.update'));

DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE TO authenticated
  USING (check_permission(auth.uid(), 'products.categories.delete'));

-- Brands: read all, write with permission
DROP POLICY IF EXISTS "brands_select" ON public.brands;
CREATE POLICY "brands_select" ON public.brands
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "brands_modify" ON public.brands;
CREATE POLICY "brands_modify" ON public.brands
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'products.products.update'))
  WITH CHECK (check_permission(auth.uid(), 'products.products.update'));

-- Units: read all, write with permission
DROP POLICY IF EXISTS "units_select" ON public.units;
CREATE POLICY "units_select" ON public.units
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "units_modify" ON public.units;
CREATE POLICY "units_modify" ON public.units
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'products.products.update'))
  WITH CHECK (check_permission(auth.uid(), 'products.products.update'));

-- Products: read with permission, write with permission
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'products.products.read'));

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'products.products.create'));

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'products.products.update'));

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (check_permission(auth.uid(), 'products.products.delete'));

-- Product Units: follows product permissions
DROP POLICY IF EXISTS "product_units_select" ON public.product_units;
CREATE POLICY "product_units_select" ON public.product_units
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'products.products.read'));

DROP POLICY IF EXISTS "product_units_modify" ON public.product_units;
CREATE POLICY "product_units_modify" ON public.product_units
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'products.products.update'))
  WITH CHECK (check_permission(auth.uid(), 'products.products.update'));

-- Price Lists: read with permission, write with permission
DROP POLICY IF EXISTS "price_lists_select" ON public.price_lists;
CREATE POLICY "price_lists_select" ON public.price_lists
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'products.prices.read'));

DROP POLICY IF EXISTS "price_lists_insert" ON public.price_lists;
CREATE POLICY "price_lists_insert" ON public.price_lists
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'products.prices.create'));

DROP POLICY IF EXISTS "price_lists_update" ON public.price_lists;
CREATE POLICY "price_lists_update" ON public.price_lists
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'products.prices.update'));

-- Price List Items: follows price list permissions
DROP POLICY IF EXISTS "price_list_items_select" ON public.price_list_items;
CREATE POLICY "price_list_items_select" ON public.price_list_items
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'products.prices.read'));

DROP POLICY IF EXISTS "price_list_items_modify" ON public.price_list_items;
CREATE POLICY "price_list_items_modify" ON public.price_list_items
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'products.prices.update'))
  WITH CHECK (check_permission(auth.uid(), 'products.prices.update'));

-- ── Inventory module ─────────────────────────────────────────

-- Warehouses
DROP POLICY IF EXISTS "warehouses_select" ON public.warehouses;
CREATE POLICY "warehouses_select" ON public.warehouses
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'inventory.stock.read'));

DROP POLICY IF EXISTS "warehouses_modify" ON public.warehouses;
CREATE POLICY "warehouses_modify" ON public.warehouses
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'inventory.stock.update'))
  WITH CHECK (check_permission(auth.uid(), 'inventory.stock.update'));

-- Stock
DROP POLICY IF EXISTS "stock_select" ON public.stock;
CREATE POLICY "stock_select" ON public.stock
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'inventory.stock.read'));

DROP POLICY IF EXISTS "stock_modify" ON public.stock;
CREATE POLICY "stock_modify" ON public.stock
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'inventory.stock.update'))
  WITH CHECK (check_permission(auth.uid(), 'inventory.stock.update'));

-- Stock Batches
DROP POLICY IF EXISTS "stock_batches_select" ON public.stock_batches;
CREATE POLICY "stock_batches_select" ON public.stock_batches
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'inventory.stock.read'));

DROP POLICY IF EXISTS "stock_batches_modify" ON public.stock_batches;
CREATE POLICY "stock_batches_modify" ON public.stock_batches
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'inventory.stock.update'))
  WITH CHECK (check_permission(auth.uid(), 'inventory.stock.update'));

-- Stock Movements
DROP POLICY IF EXISTS "movements_select" ON public.stock_movements;
CREATE POLICY "movements_select" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'inventory.movements.read'));

DROP POLICY IF EXISTS "movements_insert" ON public.stock_movements;
CREATE POLICY "movements_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'inventory.stock.update'));

-- ── CRM module ───────────────────────────────────────────────

-- Customers
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.read'));

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'crm.customers.create'));

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.update'));

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.delete'));

-- Customer Contacts
DROP POLICY IF EXISTS "customer_contacts_select" ON public.customer_contacts;
CREATE POLICY "customer_contacts_select" ON public.customer_contacts
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.read'));

DROP POLICY IF EXISTS "customer_contacts_modify" ON public.customer_contacts;
CREATE POLICY "customer_contacts_modify" ON public.customer_contacts
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.update'))
  WITH CHECK (check_permission(auth.uid(), 'crm.customers.update'));

-- Customer Addresses
DROP POLICY IF EXISTS "customer_addresses_select" ON public.customer_addresses;
CREATE POLICY "customer_addresses_select" ON public.customer_addresses
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.read'));

DROP POLICY IF EXISTS "customer_addresses_modify" ON public.customer_addresses;
CREATE POLICY "customer_addresses_modify" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'crm.customers.update'))
  WITH CHECK (check_permission(auth.uid(), 'crm.customers.update'));

-- ── Suppliers ────────────────────────────────────────────────

DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.read'));

DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
CREATE POLICY "suppliers_insert" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (check_permission(auth.uid(), 'purchases.suppliers.create'));

DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.update'));

DROP POLICY IF EXISTS "suppliers_delete" ON public.suppliers;
CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.delete'));

DROP POLICY IF EXISTS "supplier_contacts_select" ON public.supplier_contacts;
CREATE POLICY "supplier_contacts_select" ON public.supplier_contacts
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.read'));

DROP POLICY IF EXISTS "supplier_contacts_modify" ON public.supplier_contacts;
CREATE POLICY "supplier_contacts_modify" ON public.supplier_contacts
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.update'))
  WITH CHECK (check_permission(auth.uid(), 'purchases.suppliers.update'));

DROP POLICY IF EXISTS "supplier_brands_select" ON public.supplier_brands;
CREATE POLICY "supplier_brands_select" ON public.supplier_brands
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.read'));

DROP POLICY IF EXISTS "supplier_brands_modify" ON public.supplier_brands;
CREATE POLICY "supplier_brands_modify" ON public.supplier_brands
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'purchases.suppliers.update'))
  WITH CHECK (check_permission(auth.uid(), 'purchases.suppliers.update'));

-- ── HR / Employees ───────────────────────────────────────────

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'hr.employees.read'));

DROP POLICY IF EXISTS "employees_modify" ON public.employees;
CREATE POLICY "employees_modify" ON public.employees
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'hr.employees.update'))
  WITH CHECK (check_permission(auth.uid(), 'hr.employees.update'));

DROP POLICY IF EXISTS "sales_reps_select" ON public.sales_reps;
CREATE POLICY "sales_reps_select" ON public.sales_reps
  FOR SELECT TO authenticated
  USING (check_permission(auth.uid(), 'hr.employees.read'));

DROP POLICY IF EXISTS "sales_reps_modify" ON public.sales_reps;
CREATE POLICY "sales_reps_modify" ON public.sales_reps
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'hr.employees.update'))
  WITH CHECK (check_permission(auth.uid(), 'hr.employees.update'));

-- ── Shipping Companies ───────────────────────────────────────

DROP POLICY IF EXISTS "shipping_companies_select" ON public.shipping_companies;
CREATE POLICY "shipping_companies_select" ON public.shipping_companies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "shipping_companies_modify" ON public.shipping_companies;
CREATE POLICY "shipping_companies_modify" ON public.shipping_companies
  FOR ALL TO authenticated
  USING (check_permission(auth.uid(), 'settings.general.update'))
  WITH CHECK (check_permission(auth.uid(), 'settings.general.update'));

-- ============================================================
-- 12. SEED DATA — Default units
-- ============================================================
INSERT INTO public.units (name, symbol) VALUES
  ('قطعة', 'قطعة'),
  ('كرتونة', 'كرتونة'),
  ('لتر', 'لتر'),
  ('كيلوجرام', 'كجم'),
  ('علبة', 'علبة'),
  ('عبوة', 'عبوة'),
  ('جالون', 'جالون'),
  ('درزن', 'درزن')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 13. SEED DATA — Default price list
-- ============================================================
INSERT INTO public.price_lists (name, is_default) VALUES
  ('السعر الأساسي', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 14. SEED DATA — Supplier & Shipping permissions (not in Phase 1)
-- ============================================================
INSERT INTO public.permissions (module, entity, action, display_name) VALUES
  ('purchases', 'suppliers', 'create', 'إنشاء مورد'),
  ('purchases', 'suppliers', 'read', 'عرض الموردين'),
  ('purchases', 'suppliers', 'update', 'تعديل مورد'),
  ('purchases', 'suppliers', 'delete', 'حذف مورد'),
  ('settings', 'shipping', 'read', 'عرض شركات الشحن'),
  ('settings', 'shipping', 'update', 'إدارة شركات الشحن')
ON CONFLICT (module, entity, action) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- Assign new permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND p.module IN ('purchases')
  AND p.entity = 'suppliers'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND p.module = 'settings'
  AND p.entity = 'shipping'
ON CONFLICT (role_id, permission_id) DO NOTHING;
