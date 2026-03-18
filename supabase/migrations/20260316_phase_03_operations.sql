-- ============================================================
-- EDARA — المرحلة 3: العمليات التشغيلية
-- Migration: Phase 03 Operations
-- الجغرافيا + المبيعات + المشتريات + المالية
-- Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1. CUSTOM TYPES (ENUMs)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
    CREATE TYPE purchase_order_status AS ENUM ('draft', 'approved', 'partially_received', 'received', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receipt_status') THEN
    CREATE TYPE receipt_status AS ENUM ('pending_approval', 'approved', 'rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
    CREATE TYPE expense_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'paid');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_proof_status') THEN
    CREATE TYPE payment_proof_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vault_type') THEN
    CREATE TYPE vault_type AS ENUM ('cash', 'bank', 'mobile_wallet');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vault_transaction_type') THEN
    CREATE TYPE vault_transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'collection', 'payment', 'expense');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custody_transaction_type') THEN
    CREATE TYPE custody_transaction_type AS ENUM ('load', 'collection', 'expense', 'settlement', 'return');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_status') THEN
    CREATE TYPE journal_status AS ENUM ('draft', 'posted');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM ('cash', 'bank_transfer', 'instapay', 'check');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE discount_type AS ENUM ('product', 'invoice', 'quantity', 'bundle', 'cash_payment');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_scope') THEN
    CREATE TYPE discount_scope AS ENUM ('company', 'customer', 'category', 'product');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_type') THEN
    CREATE TYPE approval_type AS ENUM ('expense', 'purchase_order', 'discount_override');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fiscal_period_status') THEN
    CREATE TYPE fiscal_period_status AS ENUM ('open', 'closed');
  END IF;
END $$;

-- ============================================================
-- 2. TABLES — البنية الجغرافية والفروع
-- ============================================================

-- 2.1 المحافظات
CREATE TABLE IF NOT EXISTS public.governorates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.governorates IS 'المحافظات المصرية';

-- 2.2 المدن
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  governorate_id UUID NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(governorate_id, name)
);
COMMENT ON TABLE public.cities IS 'المدن';

-- 2.3 المناطق
CREATE TABLE IF NOT EXISTS public.areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_id, name)
);
COMMENT ON TABLE public.areas IS 'المناطق — مستوى أدق من المدن';

-- 2.4 الفروع
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.branches IS 'فروع الشركة';

-- ============================================================
-- 3. ALTER EXISTING TABLES — تعديلات الجداول الموجودة
-- ============================================================

-- 3.1 customers += governorate_id, city_id, area_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='governorate_id') THEN
    ALTER TABLE public.customers ADD COLUMN governorate_id UUID REFERENCES public.governorates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='city_id') THEN
    ALTER TABLE public.customers ADD COLUMN city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='area_id') THEN
    ALTER TABLE public.customers ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.2 employees += branch_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='branch_id') THEN
    ALTER TABLE public.employees ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.3 warehouses += branch_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='warehouses' AND column_name='branch_id') THEN
    ALTER TABLE public.warehouses ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.4 suppliers += current_balance
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='current_balance') THEN
    ALTER TABLE public.suppliers ADD COLUMN current_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 3b. TABLES — البنية المالية (خزائن + عهد) — مطلوبة قبل المبيعات
-- ============================================================

-- الخزائن والبنوك
CREATE TABLE IF NOT EXISTS public.vaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type vault_type NOT NULL DEFAULT 'cash',
  account_number TEXT,
  bank_name TEXT,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vaults IS 'الخزائن والحسابات البنكية';

-- حركات الخزنة
CREATE TABLE IF NOT EXISTS public.vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE RESTRICT,
  type vault_transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vault_transactions IS 'حركات الخزنة — إيداع/سحب/تحويل/تحصيل/مصروف';

-- عهدة الموظفين
CREATE TABLE IF NOT EXISTS public.custody_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);
COMMENT ON TABLE public.custody_accounts IS 'حسابات العهدة — لكل موظف ميداني';

-- حركات العهدة
CREATE TABLE IF NOT EXISTS public.custody_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custody_id UUID NOT NULL REFERENCES public.custody_accounts(id) ON DELETE RESTRICT,
  type custody_transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.custody_transactions IS 'حركات العهدة — تحميل/تحصيل/مصروف/تسوية/إرجاع';

-- ============================================================
-- 4. TABLES — المبيعات
-- ============================================================

-- 4.1 أوامر البيع
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  sales_rep_id UUID REFERENCES public.sales_reps(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_method delivery_method NOT NULL DEFAULT 'direct',
  shipping_company_id UUID REFERENCES public.shipping_companies(id) ON DELETE SET NULL,
  delivery_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  payment_method payment_terms_type NOT NULL DEFAULT 'cash',
  vault_id UUID REFERENCES public.vaults(id) ON DELETE SET NULL,
  custody_id UUID REFERENCES public.custody_accounts(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sales_orders IS 'أوامر البيع — draft/confirmed/cancelled';

-- 4.2 بنود أمر البيع
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sales_order_items IS 'بنود أمر البيع';

-- 4.3 مرتجعات المبيعات
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'draft',
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  notes TEXT,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sales_returns IS 'مرتجعات المبيعات — جزئي أو كلي';

-- 4.4 بنود مرتجع المبيعات (جزئي)
CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.sales_order_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sales_return_items IS 'بنود مرتجع — بند واحد أو كمية جزئية من بند';

-- 4.5 قواعد الخصومات
CREATE TABLE IF NOT EXISTS public.discount_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type discount_type NOT NULL,
  scope discount_scope NOT NULL DEFAULT 'company',
  scope_id UUID,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT true,
  min_qty NUMERIC(12,2),
  max_qty NUMERIC(12,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.discount_rules IS 'قواعد الخصومات — منتج/فاتورة/كمية/باندل/نقدي';

-- 4.6 بنود الخصم (باندل)
CREATE TABLE IF NOT EXISTS public.discount_rule_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES public.discount_rules(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  free_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.discount_rule_items IS 'بنود عروض الباندل';

-- 4.7 إثباتات الدفع
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_type TEXT NOT NULL,
  reference_id UUID,
  image_url TEXT NOT NULL,
  payment_method payment_method_type NOT NULL DEFAULT 'bank_transfer',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status payment_proof_status NOT NULL DEFAULT 'pending',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.payment_proofs IS 'إثباتات الدفع — صور تحويل بنكي أو InstaPay';

-- ============================================================
-- 5. TABLES — المشتريات
-- ============================================================

-- 5.1 أوامر الشراء
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_terms_type NOT NULL DEFAULT 'cash',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_orders IS 'أوامر الشراء';

-- 5.2 بنود أمر الشراء
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_order_items IS 'بنود أمر الشراء';

-- 5.3 إذون الاستلام
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT UNIQUE NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  status receipt_status NOT NULL DEFAULT 'pending_approval',
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_receipts IS 'إذون الاستلام — مقارنة مطلوب vs فعلي';

-- 5.4 بنود إذن الاستلام
CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  ordered_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  accepted_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejected_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  batch_number TEXT,
  expiry_date DATE,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_receipt_items IS 'بنود الاستلام — فحص الجودة والكمية';

-- 5.5 مرتجعات المشتريات
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'draft',
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  notes TEXT,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_returns IS 'مرتجعات المشتريات';

-- 5.6 بنود مرتجع المشتريات
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1,
  base_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_return_items IS 'بنود مرتجع مشتريات — جزئي';

-- ============================================================
-- 6. TABLES — النظام المالي
-- ============================================================

-- 6.1 شجرة الحسابات
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.chart_of_accounts IS 'شجرة الحسابات المحاسبية';

-- 6.2 الفترات المحاسبية
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status fiscal_period_status NOT NULL DEFAULT 'open',
  closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.fiscal_periods IS 'الفترات المحاسبية';

-- 6.3 القيود المحاسبية
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  status journal_status NOT NULL DEFAULT 'draft',
  total_debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.journal_entries IS 'القيود المحاسبية — تُنشأ تلقائياً غالباً';

-- 6.4 بنود القيد
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.journal_entry_lines IS 'بنود القيد — مدين ودائن';

-- 6.5 بنود المصروفات (هرمي)
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.expense_categories IS 'بنود المصروفات — هرمية ديناميكية';

-- 6.10 المصروفات
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_number TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  vault_id UUID REFERENCES public.vaults(id) ON DELETE SET NULL,
  custody_id UUID REFERENCES public.custody_accounts(id) ON DELETE SET NULL,
  status expense_status NOT NULL DEFAULT 'draft',
  description TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.expenses IS 'المصروفات — مع سلسلة اعتماد';

-- 6.11 سداد العملاء
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method payment_method_type NOT NULL DEFAULT 'cash',
  vault_id UUID REFERENCES public.vaults(id) ON DELETE SET NULL,
  custody_id UUID REFERENCES public.custody_accounts(id) ON DELETE SET NULL,
  collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  proof_id UUID REFERENCES public.payment_proofs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.customer_payments IS 'سداد العملاء — نقدي/بنكي/إنستاباي/شيك';

-- 6.12 سداد الموردين
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method payment_method_type NOT NULL DEFAULT 'cash',
  vault_id UUID REFERENCES public.vaults(id) ON DELETE SET NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.supplier_payments IS 'سداد الموردين';

-- 6.13 قواعد الاعتماد
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type approval_type NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  requires_escalation_above NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.approval_rules IS 'قواعد الاعتماد — حد أقصى لكل مستوى';

-- ============================================================
-- 7. FUNCTIONS — ترقيم الأوامر
-- ============================================================

CREATE OR REPLACE FUNCTION generate_order_number(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_seq INT;
  v_date TEXT;
BEGIN
  v_date := to_char(CURRENT_DATE, 'YYMMDD');

  CASE p_type
    WHEN 'SO' THEN v_prefix := 'SO';
    WHEN 'SR' THEN v_prefix := 'SR';
    WHEN 'PO' THEN v_prefix := 'PO';
    WHEN 'PR' THEN v_prefix := 'PR';
    WHEN 'RC' THEN v_prefix := 'RC';
    WHEN 'EXP' THEN v_prefix := 'EXP';
    WHEN 'CP' THEN v_prefix := 'CP';
    WHEN 'SP' THEN v_prefix := 'SP';
    WHEN 'JE' THEN v_prefix := 'JE';
    ELSE v_prefix := 'ORD';
  END CASE;

  PERFORM pg_advisory_xact_lock(hashtext(v_prefix || v_date));

  SELECT COALESCE(MAX(
    CASE WHEN order_num LIKE '%-%-%'
      THEN split_part(order_num, '-', 3)::INT
      ELSE 0
    END
  ), 0) + 1 INTO v_seq
  FROM (
    SELECT order_number AS order_num FROM sales_orders WHERE order_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT return_number FROM sales_returns WHERE return_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT order_number FROM purchase_orders WHERE order_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT return_number FROM purchase_returns WHERE return_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT receipt_number FROM purchase_receipts WHERE receipt_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT expense_number FROM expenses WHERE expense_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT payment_number FROM customer_payments WHERE payment_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT payment_number FROM supplier_payments WHERE payment_number LIKE v_prefix || '-' || v_date || '-%'
    UNION ALL
    SELECT entry_number FROM journal_entries WHERE entry_number LIKE v_prefix || '-' || v_date || '-%'
  ) AS all_nums;

  RETURN v_prefix || '-' || v_date || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- 7.2 فحص الحد الائتماني
-- ============================================================

CREATE OR REPLACE FUNCTION check_credit_limit(p_customer_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_credit_limit NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  SELECT credit_limit, current_balance
  INTO v_credit_limit, v_current_balance
  FROM customers WHERE id = p_customer_id;

  IF v_credit_limit = 0 THEN RETURN true; END IF;
  RETURN (v_current_balance + p_amount) <= v_credit_limit;
END;
$$;

-- ============================================================
-- 7.3 جلب سعر المنتج للعميل
-- ============================================================

CREATE OR REPLACE FUNCTION get_product_price(
  p_product_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_qty NUMERIC DEFAULT 1
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_price NUMERIC;
  v_price_list_id UUID;
  v_conversion NUMERIC := 1;
  v_unit_price NUMERIC;
BEGIN
  IF p_customer_id IS NOT NULL THEN
    SELECT price_list_id INTO v_price_list_id FROM customers WHERE id = p_customer_id;
  END IF;

  IF v_price_list_id IS NOT NULL THEN
    SELECT price INTO v_price
    FROM price_list_items
    WHERE price_list_id = v_price_list_id AND product_id = p_product_id AND min_qty <= p_qty
    ORDER BY min_qty DESC LIMIT 1;
  END IF;

  IF v_price IS NULL THEN
    SELECT pli.price INTO v_price
    FROM price_list_items pli
    JOIN price_lists pl ON pl.id = pli.price_list_id
    WHERE pl.is_default = true AND pli.product_id = p_product_id AND pli.min_qty <= p_qty
    ORDER BY pli.min_qty DESC LIMIT 1;
  END IF;

  IF v_price IS NULL THEN
    SELECT selling_price INTO v_price FROM products WHERE id = p_product_id;
  END IF;

  IF p_unit_id IS NOT NULL THEN
    SELECT pu.selling_price INTO v_unit_price
    FROM product_units pu
    WHERE pu.product_id = p_product_id AND pu.unit_id = p_unit_id AND pu.selling_price IS NOT NULL;

    IF v_unit_price IS NOT NULL THEN
      v_price := v_unit_price;
    ELSE
      SELECT conversion_factor INTO v_conversion
      FROM product_units WHERE product_id = p_product_id AND unit_id = p_unit_id;
      v_price := COALESCE(v_price, 0) * COALESCE(v_conversion, 1);
    END IF;
  END IF;

  RETURN COALESCE(v_price, 0);
END;
$$;

-- ============================================================
-- 7.4 فحص صلاحية الاعتماد
-- ============================================================

CREATE OR REPLACE FUNCTION can_approve(p_user_id UUID, p_type approval_type, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_max NUMERIC := 0;
BEGIN
  SELECT COALESCE(MAX(ar.max_amount), 0) INTO v_max
  FROM approval_rules ar
  LEFT JOIN user_roles ur ON ur.role_id = ar.role_id AND ur.user_id = p_user_id
  WHERE ar.type = p_type
    AND ar.is_active = true
    AND (ar.user_id = p_user_id OR ur.user_id IS NOT NULL);

  IF check_permission(p_user_id, '*') THEN RETURN true; END IF;
  RETURN p_amount <= v_max;
END;
$$;

-- ============================================================
-- 8. ATOMIC FUNCTIONS — المبيعات
-- ============================================================

-- 8.1 تأكيد أمر البيع
CREATE OR REPLACE FUNCTION confirm_sales_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_stock_row RECORD;
BEGIN
  SELECT * INTO v_order FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'أمر البيع غير موجود';  END IF;
  IF v_order.status != 'draft' THEN RAISE EXCEPTION 'أمر البيع ليس في حالة مسودة'; END IF;

  -- فحص الحد الائتماني للآجل
  IF v_order.payment_method != 'cash' THEN
    IF NOT check_credit_limit(v_order.customer_id, v_order.total_amount) THEN
      RAISE EXCEPTION 'تجاوز الحد الائتماني للعميل';
    END IF;
  END IF;

  -- خصم المخزون
  FOR v_item IN SELECT * FROM sales_order_items WHERE order_id = p_order_id LOOP
    SELECT * INTO v_stock_row FROM stock
    WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id FOR UPDATE;

    IF v_stock_row IS NULL OR v_stock_row.quantity < v_item.base_quantity THEN
      RAISE EXCEPTION 'رصيد غير كافي للمنتج %', v_item.product_id;
    END IF;

    UPDATE stock SET quantity = quantity - v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_order.warehouse_id, 'sales_out', -v_item.base_quantity, 'sales_order', p_order_id, p_user_id);
  END LOOP;

  -- تحديث رصيد العميل (آجل) أو خزنة/عهدة (نقدي)
  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance + v_order.total_amount, updated_at = now()
    WHERE id = v_order.customer_id;
  ELSE
    -- إيداع نقدي في خزنة أو عهدة
    IF v_order.vault_id IS NOT NULL THEN
      UPDATE vaults SET current_balance = current_balance + v_order.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'collection', v_order.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_order', p_order_id, 'تحصيل نقدي من أمر بيع', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      UPDATE custody_accounts SET current_balance = current_balance + v_order.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'collection', v_order.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_order', p_order_id, 'تحصيل نقدي من أمر بيع', p_user_id);
    END IF;
  END IF;

  UPDATE sales_orders SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  PERFORM auto_journal_entry('sales_order', p_order_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- 8.2 تأكيد مرتجع المبيعات (جزئي)
CREATE OR REPLACE FUNCTION confirm_sales_return(p_return_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_order RECORD;
BEGIN
  SELECT * INTO v_return FROM sales_returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN RAISE EXCEPTION 'المرتجع غير موجود'; END IF;
  IF v_return.status != 'draft' THEN RAISE EXCEPTION 'المرتجع ليس في حالة مسودة'; END IF;

  SELECT * INTO v_order FROM sales_orders WHERE id = v_return.order_id;

  FOR v_item IN SELECT * FROM sales_return_items WHERE return_id = p_return_id LOOP
    UPDATE stock SET quantity = quantity + v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id;

    IF NOT FOUND THEN
      INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (v_item.product_id, v_return.warehouse_id, v_item.base_quantity);
    END IF;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_return.warehouse_id, 'return_in', v_item.base_quantity, 'sales_return', p_return_id, p_user_id);
  END LOOP;

  -- عكس الرصيد المالي
  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.customer_id;
  ELSE
    -- استرداد نقدي من الخزنة أو العهدة
    IF v_order.vault_id IS NOT NULL THEN
      IF (SELECT current_balance FROM vaults WHERE id = v_order.vault_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لاسترداد المرتجع';
      END IF;
      UPDATE vaults SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'withdrawal', -v_return.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      IF (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد العهدة غير كافٍ لاسترداد المرتجع';
      END IF;
      UPDATE custody_accounts SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'return', -v_return.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    END IF;
  END IF;

  UPDATE sales_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  PERFORM auto_journal_entry('sales_return', p_return_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

-- 8.3 إلغاء أمر بيع مؤكد
CREATE OR REPLACE FUNCTION cancel_sales_order(p_order_id UUID, p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'أمر البيع غير موجود'; END IF;
  IF v_order.status = 'cancelled' THEN RAISE EXCEPTION 'أمر البيع ملغى بالفعل'; END IF;

  -- إذا كان مؤكداً → نعكس المخزون والأرصدة
  IF v_order.status = 'confirmed' THEN
    FOR v_item IN SELECT * FROM sales_order_items WHERE order_id = p_order_id LOOP
      UPDATE stock SET quantity = quantity + v_item.base_quantity, updated_at = now()
      WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;

      IF NOT FOUND THEN
        INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (v_item.product_id, v_order.warehouse_id, v_item.base_quantity);
      END IF;

      INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
      VALUES (v_item.product_id, v_order.warehouse_id, 'adjustment', v_item.base_quantity, 'sales_order_cancel', p_order_id, p_user_id);
    END LOOP;

    -- عكس الرصيد المالي
    IF v_order.payment_method != 'cash' THEN
      UPDATE customers SET current_balance = current_balance - v_order.total_amount, updated_at = now()
      WHERE id = v_order.customer_id;
    ELSE
      IF v_order.vault_id IS NOT NULL THEN
        IF (SELECT current_balance FROM vaults WHERE id = v_order.vault_id FOR UPDATE) < v_order.total_amount THEN
          RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لإلغاء أمر البيع';
        END IF;
        UPDATE vaults SET current_balance = current_balance - v_order.total_amount, updated_at = now()
        WHERE id = v_order.vault_id;
        INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
        VALUES (v_order.vault_id, 'withdrawal', -v_order.total_amount,
          (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
          'sales_order_cancel', p_order_id, 'إلغاء أمر بيع نقدي', p_user_id);
      ELSIF v_order.custody_id IS NOT NULL THEN
        IF (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id FOR UPDATE) < v_order.total_amount THEN
          RAISE EXCEPTION 'رصيد العهدة غير كافٍ لإلغاء أمر البيع';
        END IF;
        UPDATE custody_accounts SET current_balance = current_balance - v_order.total_amount, updated_at = now()
        WHERE id = v_order.custody_id;
        INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
        VALUES (v_order.custody_id, 'return', -v_order.total_amount,
          (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
          'sales_order_cancel', p_order_id, 'إلغاء أمر بيع نقدي', p_user_id);
      END IF;
    END IF;
  END IF;

  UPDATE sales_orders SET status = 'cancelled', cancelled_by = p_user_id, cancelled_at = now(),
    cancellation_reason = p_reason, updated_at = now()
  WHERE id = p_order_id;

  -- قيد عكسي في حالة الإلغاء
  IF v_order.status = 'confirmed' THEN
    PERFORM auto_journal_entry('sales_order_cancel', p_order_id, p_user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- ============================================================
-- 9. ATOMIC FUNCTIONS — المشتريات
-- ============================================================

-- 9.1 اعتماد أمر شراء
CREATE OR REPLACE FUNCTION approve_purchase_order(p_po_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po RECORD;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF v_po IS NULL THEN RAISE EXCEPTION 'أمر الشراء غير موجود'; END IF;
  IF v_po.status != 'draft' THEN RAISE EXCEPTION 'أمر الشراء ليس في حالة مسودة'; END IF;

  UPDATE purchase_orders SET status = 'approved', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_po_id;

  RETURN jsonb_build_object('success', true, 'po_id', p_po_id);
END;
$$;

-- 9.2 اعتماد إذن استلام
CREATE OR REPLACE FUNCTION approve_purchase_receipt(p_receipt_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt RECORD;
  v_po RECORD;
  v_item RECORD;
  v_all_received BOOLEAN;
BEGIN
  SELECT * INTO v_receipt FROM purchase_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF v_receipt IS NULL THEN RAISE EXCEPTION 'إذن الاستلام غير موجود'; END IF;
  IF v_receipt.status != 'pending_approval' THEN RAISE EXCEPTION 'إذن الاستلام ليس في حالة انتظار'; END IF;

  FOR v_item IN SELECT * FROM purchase_receipt_items WHERE receipt_id = p_receipt_id LOOP
    IF v_item.accepted_quantity > 0 THEN
      INSERT INTO stock (product_id, warehouse_id, quantity)
      VALUES (v_item.product_id, v_receipt.warehouse_id, v_item.base_quantity)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
        quantity = stock.quantity + v_item.base_quantity, updated_at = now();

      INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
      VALUES (v_item.product_id, v_receipt.warehouse_id, 'purchase_in', v_item.base_quantity, 'purchase_receipt', p_receipt_id, p_user_id);

      UPDATE purchase_order_items SET received_quantity = received_quantity + v_item.base_quantity
      WHERE id = v_item.order_item_id;
    END IF;
  END LOOP;

  UPDATE purchase_receipts SET status = 'approved', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_receipt_id;

  SELECT * INTO v_po FROM purchase_orders WHERE id = v_receipt.purchase_order_id FOR UPDATE;

  SELECT NOT EXISTS(
    SELECT 1 FROM purchase_order_items WHERE order_id = v_po.id AND received_quantity < base_quantity
  ) INTO v_all_received;

  IF v_all_received THEN
    UPDATE purchase_orders SET status = 'received', updated_at = now() WHERE id = v_po.id;
  ELSE
    UPDATE purchase_orders SET status = 'partially_received', updated_at = now() WHERE id = v_po.id;
  END IF;

  IF v_po.payment_method != 'cash' THEN
    DECLARE v_receipt_total NUMERIC;
    BEGIN
      SELECT COALESCE(SUM(pri.accepted_quantity * poi.unit_price), 0) INTO v_receipt_total
      FROM purchase_receipt_items pri
      JOIN purchase_order_items poi ON poi.id = pri.order_item_id
      WHERE pri.receipt_id = p_receipt_id AND pri.accepted_quantity > 0;

      UPDATE suppliers SET current_balance = current_balance + v_receipt_total, updated_at = now()
      WHERE id = v_po.supplier_id;
    END;
  END IF;

  PERFORM auto_journal_entry('purchase_receipt', p_receipt_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'receipt_id', p_receipt_id);
END;
$$;

-- 9.3 تأكيد مرتجع مشتريات
CREATE OR REPLACE FUNCTION confirm_purchase_return(p_return_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_return FROM purchase_returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN RAISE EXCEPTION 'المرتجع غير موجود'; END IF;
  IF v_return.status != 'draft' THEN RAISE EXCEPTION 'المرتجع ليس في حالة مسودة'; END IF;

  FOR v_item IN SELECT * FROM purchase_return_items WHERE return_id = p_return_id LOOP
    -- فحص رصيد المخزون الكافي قبل الخصم
    DECLARE v_stock_qty NUMERIC;
    BEGIN
      SELECT quantity INTO v_stock_qty FROM stock
      WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id FOR UPDATE;
      IF COALESCE(v_stock_qty, 0) < v_item.base_quantity THEN
        RAISE EXCEPTION 'رصيد مخزون غير كافٍ لإرجاع المنتج %', v_item.product_id;
      END IF;
    END;

    UPDATE stock SET quantity = quantity - v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_return.warehouse_id, 'return_out', -v_item.base_quantity, 'purchase_return', p_return_id, p_user_id);
  END LOOP;

  -- فحص طريقة الدفع قبل تعديل رصيد المورد
  IF v_return.purchase_order_id IS NOT NULL THEN
    DECLARE v_po_payment payment_terms_type;
    BEGIN
      SELECT payment_method INTO v_po_payment FROM purchase_orders WHERE id = v_return.purchase_order_id;
      IF v_po_payment != 'cash' THEN
        UPDATE suppliers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
        WHERE id = v_return.supplier_id;
      END IF;
    END;
  ELSE
    UPDATE suppliers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.supplier_id;
  END IF;

  UPDATE purchase_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  PERFORM auto_journal_entry('purchase_return', p_return_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

-- ============================================================
-- 10. ATOMIC FUNCTIONS — المالية
-- ============================================================

-- 10.1 تسجيل سداد عميل (حالة معلقة — لا تؤثر على الأرصدة)
CREATE OR REPLACE FUNCTION record_customer_payment(
  p_customer_id UUID, p_amount NUMERIC, p_method payment_method_type,
  p_vault_id UUID DEFAULT NULL, p_custody_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_proof_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_num TEXT;
BEGIN
  v_num := generate_order_number('CP');

  INSERT INTO customer_payments (payment_number, customer_id, amount, payment_method, vault_id, custody_id, collected_by, status, notes, proof_id, created_by)
  VALUES (v_num, p_customer_id, p_amount, p_method, p_vault_id, p_custody_id, p_user_id, 'pending', p_notes, p_proof_id, p_user_id)
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'payment_number', v_num, 'status', 'pending');
END;
$$;

-- 10.1b تأكيد سداد عميل (تطبيق الأرصدة والقيد المحاسبي)
CREATE OR REPLACE FUNCTION confirm_customer_payment(p_payment_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM customer_payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment IS NULL THEN RAISE EXCEPTION 'السداد غير موجود'; END IF;
  IF v_payment.status != 'pending' THEN RAISE EXCEPTION 'السداد ليس في حالة معلقة'; END IF;

  UPDATE customers SET current_balance = current_balance - v_payment.amount, updated_at = now()
  WHERE id = v_payment.customer_id;

  IF v_payment.vault_id IS NOT NULL THEN
    UPDATE vaults SET current_balance = current_balance + v_payment.amount, updated_at = now() WHERE id = v_payment.vault_id;
    INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
    VALUES (v_payment.vault_id, 'collection', v_payment.amount, (SELECT current_balance FROM vaults WHERE id = v_payment.vault_id), 'customer_payment', p_payment_id, 'تحصيل من عميل', p_user_id);
  ELSIF v_payment.custody_id IS NOT NULL THEN
    UPDATE custody_accounts SET current_balance = current_balance + v_payment.amount, updated_at = now() WHERE id = v_payment.custody_id;
    INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
    VALUES (v_payment.custody_id, 'collection', v_payment.amount, (SELECT current_balance FROM custody_accounts WHERE id = v_payment.custody_id), 'customer_payment', p_payment_id, 'تحصيل من عميل', p_user_id);
  END IF;

  UPDATE customer_payments SET status = 'confirmed', updated_at = now() WHERE id = p_payment_id;

  PERFORM auto_journal_entry('customer_payment', p_payment_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id);
END;
$$;

-- 10.1c إلغاء سداد عميل (عكس التأثير إذا كان مؤكداً)
CREATE OR REPLACE FUNCTION cancel_customer_payment(p_payment_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM customer_payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment IS NULL THEN RAISE EXCEPTION 'السداد غير موجود'; END IF;
  IF v_payment.status = 'cancelled' THEN RAISE EXCEPTION 'السداد ملغى بالفعل'; END IF;

  IF v_payment.status = 'confirmed' THEN
    -- عكس رصيد العميل
    UPDATE customers SET current_balance = current_balance + v_payment.amount, updated_at = now()
    WHERE id = v_payment.customer_id;

    -- عكس الخزنة أو العهدة
    IF v_payment.vault_id IS NOT NULL THEN
      IF (SELECT current_balance FROM vaults WHERE id = v_payment.vault_id FOR UPDATE) < v_payment.amount THEN
        RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لإلغاء التحصيل';
      END IF;
      UPDATE vaults SET current_balance = current_balance - v_payment.amount, updated_at = now() WHERE id = v_payment.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_payment.vault_id, 'withdrawal', -v_payment.amount, (SELECT current_balance FROM vaults WHERE id = v_payment.vault_id), 'customer_payment_cancel', p_payment_id, 'إلغاء تحصيل عميل', p_user_id);
    ELSIF v_payment.custody_id IS NOT NULL THEN
      IF (SELECT current_balance FROM custody_accounts WHERE id = v_payment.custody_id FOR UPDATE) < v_payment.amount THEN
        RAISE EXCEPTION 'رصيد العهدة غير كافٍ لإلغاء التحصيل';
      END IF;
      UPDATE custody_accounts SET current_balance = current_balance - v_payment.amount, updated_at = now() WHERE id = v_payment.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_payment.custody_id, 'return', -v_payment.amount, (SELECT current_balance FROM custody_accounts WHERE id = v_payment.custody_id), 'customer_payment_cancel', p_payment_id, 'إلغاء تحصيل عميل', p_user_id);
    END IF;

    PERFORM auto_journal_entry('customer_payment_cancel', p_payment_id, p_user_id);
  END IF;

  UPDATE customer_payments SET status = 'cancelled', updated_at = now() WHERE id = p_payment_id;
  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id);
END;
$$;

-- 10.2 تسجيل سداد مورد (حالة معلقة — لا تؤثر على الأرصدة)
CREATE OR REPLACE FUNCTION record_supplier_payment(
  p_supplier_id UUID, p_amount NUMERIC, p_method payment_method_type,
  p_vault_id UUID, p_user_id UUID, p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_num TEXT;
BEGIN
  v_num := generate_order_number('SP');

  INSERT INTO supplier_payments (payment_number, supplier_id, amount, payment_method, vault_id, status, notes, created_by)
  VALUES (v_num, p_supplier_id, p_amount, p_method, p_vault_id, 'pending', p_notes, p_user_id)
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'payment_number', v_num, 'status', 'pending');
END;
$$;

-- 10.2b تأكيد سداد مورد (فحص الخزنة + تطبيق الأرصدة والقيد)
CREATE OR REPLACE FUNCTION confirm_supplier_payment(p_payment_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM supplier_payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment IS NULL THEN RAISE EXCEPTION 'السداد غير موجود'; END IF;
  IF v_payment.status != 'pending' THEN RAISE EXCEPTION 'السداد ليس في حالة معلقة'; END IF;

  -- فحص رصيد الخزنة الكافي
  IF (SELECT current_balance FROM vaults WHERE id = v_payment.vault_id FOR UPDATE) < v_payment.amount THEN
    RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لسداد المورد';
  END IF;

  UPDATE suppliers SET current_balance = current_balance - v_payment.amount, updated_at = now()
  WHERE id = v_payment.supplier_id;

  UPDATE vaults SET current_balance = current_balance - v_payment.amount, updated_at = now() WHERE id = v_payment.vault_id;
  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
  VALUES (v_payment.vault_id, 'payment', -v_payment.amount, (SELECT current_balance FROM vaults WHERE id = v_payment.vault_id), 'supplier_payment', p_payment_id, 'سداد مورد', p_user_id);

  UPDATE supplier_payments SET status = 'confirmed', updated_at = now() WHERE id = p_payment_id;

  PERFORM auto_journal_entry('supplier_payment', p_payment_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id);
END;
$$;

-- 10.2c إلغاء سداد مورد (عكس التأثير إذا كان مؤكداً)
CREATE OR REPLACE FUNCTION cancel_supplier_payment(p_payment_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment FROM supplier_payments WHERE id = p_payment_id FOR UPDATE;
  IF v_payment IS NULL THEN RAISE EXCEPTION 'السداد غير موجود'; END IF;
  IF v_payment.status = 'cancelled' THEN RAISE EXCEPTION 'السداد ملغى بالفعل'; END IF;

  IF v_payment.status = 'confirmed' THEN
    -- عكس رصيد المورد
    UPDATE suppliers SET current_balance = current_balance + v_payment.amount, updated_at = now()
    WHERE id = v_payment.supplier_id;

    -- عكس الخزنة
    UPDATE vaults SET current_balance = current_balance + v_payment.amount, updated_at = now() WHERE id = v_payment.vault_id;
    INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
    VALUES (v_payment.vault_id, 'deposit', v_payment.amount, (SELECT current_balance FROM vaults WHERE id = v_payment.vault_id), 'supplier_payment_cancel', p_payment_id, 'إلغاء سداد مورد', p_user_id);

    PERFORM auto_journal_entry('supplier_payment_cancel', p_payment_id, p_user_id);
  END IF;

  UPDATE supplier_payments SET status = 'cancelled', updated_at = now() WHERE id = p_payment_id;
  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id);
END;
$$;

-- 10.3 اعتماد مصروف
CREATE OR REPLACE FUNCTION approve_expense(p_expense_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense RECORD;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id FOR UPDATE;
  IF v_expense IS NULL THEN RAISE EXCEPTION 'المصروف غير موجود'; END IF;
  IF v_expense.status NOT IN ('draft', 'pending_approval') THEN RAISE EXCEPTION 'المصروف ليس في حالة قابلة للاعتماد'; END IF;

  IF NOT can_approve(p_user_id, 'expense', v_expense.amount) THEN
    UPDATE expenses SET status = 'pending_approval', updated_at = now() WHERE id = p_expense_id;
    RETURN jsonb_build_object('success', false, 'reason', 'يتطلب اعتماد من مستوى أعلى');
  END IF;

  IF v_expense.vault_id IS NOT NULL THEN
    IF (SELECT current_balance FROM vaults WHERE id = v_expense.vault_id) < v_expense.amount THEN
      RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لصرف المصروف';
    END IF;
    UPDATE vaults SET current_balance = current_balance - v_expense.amount, updated_at = now() WHERE id = v_expense.vault_id;
    INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
    VALUES (v_expense.vault_id, 'expense', -v_expense.amount, (SELECT current_balance FROM vaults WHERE id = v_expense.vault_id), 'expense', p_expense_id, v_expense.description, p_user_id);
  ELSIF v_expense.custody_id IS NOT NULL THEN
    IF (SELECT current_balance FROM custody_accounts WHERE id = v_expense.custody_id FOR UPDATE) < v_expense.amount THEN
      RAISE EXCEPTION 'رصيد العهدة غير كافٍ لصرف المصروف';
    END IF;
    UPDATE custody_accounts SET current_balance = current_balance - v_expense.amount, updated_at = now() WHERE id = v_expense.custody_id;
    INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
    VALUES (v_expense.custody_id, 'expense', -v_expense.amount, (SELECT current_balance FROM custody_accounts WHERE id = v_expense.custody_id), 'expense', p_expense_id, v_expense.description, p_user_id);
  END IF;

  UPDATE expenses SET status = 'approved', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_expense_id;

  PERFORM auto_journal_entry('expense', p_expense_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'expense_id', p_expense_id);
END;
$$;

-- 10.4 تحويل بين الخزائن
CREATE OR REPLACE FUNCTION transfer_between_vaults(p_from UUID, p_to UUID, p_amount NUMERIC, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer_id UUID := uuid_generate_v4();
BEGIN
  -- فحص رصيد الخزنة المصدر
  IF (SELECT current_balance FROM vaults WHERE id = p_from FOR UPDATE) < p_amount THEN
    RAISE EXCEPTION 'رصيد الخزنة المصدر غير كافٍ للتحويل';
  END IF;

  UPDATE vaults SET current_balance = current_balance - p_amount, updated_at = now() WHERE id = p_from;
  UPDATE vaults SET current_balance = current_balance + p_amount, updated_at = now() WHERE id = p_to;

  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
  VALUES (p_from, 'transfer_out', -p_amount, (SELECT current_balance FROM vaults WHERE id = p_from), 'vault_transfer', v_transfer_id, 'تحويل صادر', p_user_id);

  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
  VALUES (p_to, 'transfer_in', p_amount, (SELECT current_balance FROM vaults WHERE id = p_to), 'vault_transfer', v_transfer_id, 'تحويل وارد', p_user_id);

  PERFORM auto_journal_entry('vault_transfer', v_transfer_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);
END;
$$;

-- 10.5 تسوية العهدة
CREATE OR REPLACE FUNCTION settle_custody(p_custody_id UUID, p_vault_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT current_balance INTO v_balance FROM custody_accounts WHERE id = p_custody_id FOR UPDATE;
  IF v_balance <= 0 THEN RAISE EXCEPTION 'لا يوجد رصيد للتسوية'; END IF;

  UPDATE custody_accounts SET current_balance = 0, updated_at = now() WHERE id = p_custody_id;
  INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, description, created_by)
  VALUES (p_custody_id, 'settlement', -v_balance, 0, 'custody_settlement', 'تسوية عهدة', p_user_id);

  UPDATE vaults SET current_balance = current_balance + v_balance, updated_at = now() WHERE id = p_vault_id;
  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, description, created_by)
  VALUES (p_vault_id, 'deposit', v_balance, (SELECT current_balance FROM vaults WHERE id = p_vault_id), 'custody_settlement', 'تسوية عهدة', p_user_id);

  PERFORM auto_journal_entry('custody_settlement', p_custody_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'settled_amount', v_balance);
END;
$$;

-- 10.6 إنشاء قيد تلقائي مع بنود مدين/دائن
CREATE OR REPLACE FUNCTION auto_journal_entry(p_source_type TEXT, p_source_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_num TEXT;
  v_desc TEXT;
  v_amount NUMERIC;
  v_debit_code TEXT;
  v_credit_code TEXT;
  v_debit_account_id UUID;
  v_credit_account_id UUID;
  v_order RECORD;
BEGIN
  v_num := generate_order_number('JE');

  CASE p_source_type
    WHEN 'sales_order' THEN
      SELECT * INTO v_order FROM sales_orders WHERE id = p_source_id;
      v_amount := v_order.total_amount;
      v_desc := 'قيد بيع — ' || v_order.order_number;
      IF v_order.payment_method = 'cash' THEN
        v_debit_code := '1100'; -- نقدية
      ELSE
        v_debit_code := '1200'; -- العملاء (ذمم مدينة)
      END IF;
      v_credit_code := '4100'; -- إيرادات المبيعات

    WHEN 'sales_return' THEN
      SELECT sr.total_amount, sr.return_number, so.payment_method
      INTO v_amount, v_desc, v_order.payment_method
      FROM sales_returns sr JOIN sales_orders so ON so.id = sr.order_id
      WHERE sr.id = p_source_id;
      v_desc := 'قيد مرتجع بيع — ' || v_desc;
      v_debit_code := '4100'; -- عكس الإيراد
      IF v_order.payment_method = 'cash' THEN
        v_credit_code := '1100'; -- نقدية
      ELSE
        v_credit_code := '1200'; -- العملاء
      END IF;

    WHEN 'purchase_receipt' THEN
      SELECT COALESCE(SUM(pri.accepted_quantity * poi.unit_price), 0), pr.receipt_number
      INTO v_amount, v_desc
      FROM purchase_receipts pr
      LEFT JOIN purchase_receipt_items pri ON pri.receipt_id = pr.id AND pri.accepted_quantity > 0
      LEFT JOIN purchase_order_items poi ON poi.id = pri.order_item_id
      WHERE pr.id = p_source_id
      GROUP BY pr.receipt_number;
      v_desc := 'قيد مشتريات — ' || v_desc;
      v_debit_code := '1300'; -- المخزون
      v_credit_code := '2100'; -- الموردين (ذمم دائنة)

    WHEN 'purchase_return' THEN
      SELECT total_amount, return_number INTO v_amount, v_desc FROM purchase_returns WHERE id = p_source_id;
      v_desc := 'قيد مرتجع مشتريات — ' || v_desc;
      v_debit_code := '2100'; -- عكس الموردين
      v_credit_code := '1300'; -- المخزون

    WHEN 'customer_payment' THEN
      SELECT amount, payment_number INTO v_amount, v_desc FROM customer_payments WHERE id = p_source_id;
      v_desc := 'قيد تحصيل — ' || v_desc;
      v_debit_code := '1100'; -- نقدية
      v_credit_code := '1200'; -- العملاء

    WHEN 'supplier_payment' THEN
      SELECT amount, payment_number INTO v_amount, v_desc FROM supplier_payments WHERE id = p_source_id;
      v_desc := 'قيد سداد مورد — ' || v_desc;
      v_debit_code := '2100'; -- الموردين
      v_credit_code := '1100'; -- نقدية

    WHEN 'expense' THEN
      SELECT amount, expense_number INTO v_amount, v_desc FROM expenses WHERE id = p_source_id;
      v_desc := 'قيد مصروف — ' || v_desc;
      v_debit_code := '5200'; -- مصروفات تشغيلية
      v_credit_code := '1100'; -- نقدية

    WHEN 'vault_transfer' THEN
      -- التحويل بين خزائن نفس الحساب — لا يحتاج قيد محاسبي
      RETURN NULL;

    WHEN 'vault_deposit' THEN
      SELECT current_balance INTO v_amount FROM vaults WHERE id = p_source_id;
      -- v_amount here is just a placeholder; we get the real amount from vault_transactions
      SELECT ABS(vt.amount) INTO v_amount FROM vault_transactions vt
      WHERE vt.vault_id = p_source_id AND vt.type = 'deposit' AND vt.reference_type = 'vault_deposit'
      ORDER BY vt.created_at DESC LIMIT 1;
      IF v_amount IS NULL THEN v_amount := 0; END IF;
      v_desc := 'قيد إيداع في الخزنة';
      v_debit_code := '1100';  -- نقدية (زيادة)
      v_credit_code := '3100'; -- رأس المال / مصدر الإيداع

    WHEN 'vault_withdrawal' THEN
      SELECT ABS(vt.amount) INTO v_amount FROM vault_transactions vt
      WHERE vt.vault_id = p_source_id AND vt.type = 'withdrawal' AND vt.reference_type = 'vault_withdrawal'
      ORDER BY vt.created_at DESC LIMIT 1;
      IF v_amount IS NULL THEN v_amount := 0; END IF;
      v_desc := 'قيد سحب من الخزنة';
      v_debit_code := '5200';  -- مصروفات / وجهة السحب
      v_credit_code := '1100'; -- نقدية (نقص)

    WHEN 'custody_settlement' THEN
      SELECT ABS(amount) INTO v_amount FROM custody_transactions
      WHERE custody_id = p_source_id AND type = 'settlement'
      ORDER BY created_at DESC LIMIT 1;
      IF v_amount IS NULL THEN v_amount := 0; END IF;
      v_desc := 'قيد تسوية عهدة';
      v_debit_code := '1100'; -- نقدية
      v_credit_code := '1400'; -- العهد

    WHEN 'custody_load' THEN
      SELECT ABS(amount) INTO v_amount FROM custody_transactions
      WHERE custody_id = p_source_id AND type = 'load'
      ORDER BY created_at DESC LIMIT 1;
      IF v_amount IS NULL THEN v_amount := 0; END IF;
      v_desc := 'قيد تحميل عهدة';
      v_debit_code := '1400'; -- العهد (زيادة)
      v_credit_code := '1100'; -- نقدية (نقص)

    WHEN 'sales_order_cancel' THEN
      SELECT * INTO v_order FROM sales_orders WHERE id = p_source_id;
      v_amount := v_order.total_amount;
      v_desc := 'قيد عكسي إلغاء بيع — ' || v_order.order_number;
      v_debit_code := '4100';
      IF v_order.payment_method = 'cash' THEN
        v_credit_code := '1100';
      ELSE
        v_credit_code := '1200';
      END IF;

    WHEN 'customer_payment_cancel' THEN
      SELECT amount, payment_number INTO v_amount, v_desc FROM customer_payments WHERE id = p_source_id;
      v_desc := 'قيد عكسي إلغاء تحصيل — ' || v_desc;
      v_debit_code := '1200'; -- العملاء (عكس)
      v_credit_code := '1100'; -- نقدية (عكس)

    WHEN 'supplier_payment_cancel' THEN
      SELECT amount, payment_number INTO v_amount, v_desc FROM supplier_payments WHERE id = p_source_id;
      v_desc := 'قيد عكسي إلغاء سداد مورد — ' || v_desc;
      v_debit_code := '1100'; -- نقدية (عكس)
      v_credit_code := '2100'; -- الموردين (عكس)

    ELSE
      v_desc := 'قيد — ' || p_source_type;
      v_amount := 0;
  END CASE;

  IF v_amount IS NULL OR v_amount = 0 THEN RETURN NULL; END IF;

  -- جلب معرفات الحسابات
  SELECT id INTO v_debit_account_id FROM chart_of_accounts WHERE code = v_debit_code;
  SELECT id INTO v_credit_account_id FROM chart_of_accounts WHERE code = v_credit_code;

  -- إنشاء القيد (header)
  INSERT INTO journal_entries (entry_number, date, description, source_type, source_id, status, total_debit, total_credit, created_by)
  VALUES (v_num, CURRENT_DATE, v_desc, p_source_type, p_source_id, 'posted', v_amount, v_amount, p_user_id)
  RETURNING id INTO v_entry_id;

  -- إنشاء بنود القيد (مدين + دائن)
  IF v_debit_account_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description)
    VALUES (v_entry_id, v_debit_account_id, v_amount, 0, v_desc);
  END IF;

  IF v_credit_account_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description)
    VALUES (v_entry_id, v_credit_account_id, 0, v_amount, v_desc);
  END IF;

  RETURN v_entry_id;
END;
$$;

-- ============================================================
-- 11. INDEXES
-- ============================================================

-- Geography
CREATE INDEX IF NOT EXISTS idx_cities_governorate ON public.cities(governorate_id);
CREATE INDEX IF NOT EXISTS idx_areas_city ON public.areas(city_id);
CREATE INDEX IF NOT EXISTS idx_branches_city ON public.branches(city_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(is_active);

-- Customer geo
CREATE INDEX IF NOT EXISTS idx_customers_governorate ON public.customers(governorate_id);
CREATE INDEX IF NOT EXISTS idx_customers_city ON public.customers(city_id);

-- Employee/Warehouse branch
CREATE INDEX IF NOT EXISTS idx_employees_branch ON public.employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON public.warehouses(branch_id);

-- Sales Orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_rep ON public.sales_orders(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_warehouse ON public.sales_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON public.sales_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_branch ON public.sales_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON public.sales_order_items(product_id);

-- Sales Returns
CREATE INDEX IF NOT EXISTS idx_sales_returns_order ON public.sales_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON public.sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON public.sales_returns(status);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return ON public.sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_order_item ON public.sales_return_items(order_item_id);

-- Discounts
CREATE INDEX IF NOT EXISTS idx_discount_rules_active ON public.discount_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_type ON public.discount_rules(type);
CREATE INDEX IF NOT EXISTS idx_discount_rule_items_rule ON public.discount_rule_items(rule_id);

-- Payment Proofs
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_ref ON public.payment_proofs(reference_type, reference_id);

-- Purchase Orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON public.purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON public.purchase_order_items(product_id);

-- Purchase Receipts
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_po ON public.purchase_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_status ON public.purchase_receipts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt ON public.purchase_receipt_items(receipt_id);

-- Purchase Returns
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON public.purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON public.purchase_returns(status);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return ON public.purchase_return_items(return_id);

-- Chart of Accounts
CREATE INDEX IF NOT EXISTS idx_coa_parent ON public.chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_code ON public.chart_of_accounts(code);

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON public.journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON public.journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);

-- Vaults
CREATE INDEX IF NOT EXISTS idx_vaults_type ON public.vaults(type);
CREATE INDEX IF NOT EXISTS idx_vaults_branch ON public.vaults(branch_id);
CREATE INDEX IF NOT EXISTS idx_vaults_active ON public.vaults(is_active);
CREATE INDEX IF NOT EXISTS idx_vault_txn_vault ON public.vault_transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_txn_date ON public.vault_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_txn_ref ON public.vault_transactions(reference_type, reference_id);

-- Custody
CREATE INDEX IF NOT EXISTS idx_custody_employee ON public.custody_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_custody_txn_custody ON public.custody_transactions(custody_id);
CREATE INDEX IF NOT EXISTS idx_custody_txn_date ON public.custody_transactions(created_at DESC);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expense_cats_parent ON public.expense_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON public.expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);

-- Customer Payments
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON public.customer_payments(status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON public.customer_payments(payment_date DESC);

-- Supplier Payments
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_status ON public.supplier_payments(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON public.supplier_payments(payment_date DESC);

-- Approval Rules
CREATE INDEX IF NOT EXISTS idx_approval_rules_type ON public.approval_rules(type);

-- ============================================================
-- 12. TRIGGERS
-- ============================================================

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_branches_updated ON public.branches;
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_sales_orders_updated ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_updated BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_sales_returns_updated ON public.sales_returns;
CREATE TRIGGER trg_sales_returns_updated BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_discount_rules_updated ON public.discount_rules;
CREATE TRIGGER trg_discount_rules_updated BEFORE UPDATE ON public.discount_rules FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_payment_proofs_updated ON public.payment_proofs;
CREATE TRIGGER trg_payment_proofs_updated BEFORE UPDATE ON public.payment_proofs FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_receipts_updated ON public.purchase_receipts;
CREATE TRIGGER trg_purchase_receipts_updated BEFORE UPDATE ON public.purchase_receipts FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_returns_updated ON public.purchase_returns;
CREATE TRIGGER trg_purchase_returns_updated BEFORE UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_coa_updated ON public.chart_of_accounts;
CREATE TRIGGER trg_coa_updated BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_journal_entries_updated ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_updated BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_vaults_updated ON public.vaults;
CREATE TRIGGER trg_vaults_updated BEFORE UPDATE ON public.vaults FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_custody_accounts_updated ON public.custody_accounts;
CREATE TRIGGER trg_custody_accounts_updated BEFORE UPDATE ON public.custody_accounts FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON public.expense_categories;
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_expenses_updated ON public.expenses;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_customer_payments_updated ON public.customer_payments;
CREATE TRIGGER trg_customer_payments_updated BEFORE UPDATE ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_supplier_payments_updated ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payments_updated BEFORE UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_approval_rules_updated ON public.approval_rules;
CREATE TRIGGER trg_approval_rules_updated BEFORE UPDATE ON public.approval_rules FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Audit triggers on financial tables
DROP TRIGGER IF EXISTS trg_sales_orders_audit ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_audit AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_purchase_orders_audit ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_audit AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_vaults_audit ON public.vaults;
CREATE TRIGGER trg_vaults_audit AFTER UPDATE ON public.vaults FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_expenses_audit ON public.expenses;
CREATE TRIGGER trg_expenses_audit AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_journal_entries_audit ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_audit AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_customer_payments_audit ON public.customer_payments;
CREATE TRIGGER trg_customer_payments_audit AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_supplier_payments_audit ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payments_audit AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_custody_accounts_audit ON public.custody_accounts;
CREATE TRIGGER trg_custody_accounts_audit AFTER UPDATE ON public.custody_accounts FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_vault_transactions_audit ON public.vault_transactions;
CREATE TRIGGER trg_vault_transactions_audit AFTER INSERT ON public.vault_transactions FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ============================================================
-- 13. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

-- ── Geography: readable by all ──
DROP POLICY IF EXISTS "governorates_select" ON public.governorates;
CREATE POLICY "governorates_select" ON public.governorates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cities_select" ON public.cities;
CREATE POLICY "cities_select" ON public.cities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "areas_select" ON public.areas;
CREATE POLICY "areas_select" ON public.areas FOR SELECT TO authenticated USING (true);

-- ── Branches ──
DROP POLICY IF EXISTS "branches_select" ON public.branches;
CREATE POLICY "branches_select" ON public.branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
CREATE POLICY "branches_insert" ON public.branches FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'settings.general.update'));
DROP POLICY IF EXISTS "branches_update" ON public.branches;
CREATE POLICY "branches_update" ON public.branches FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'settings.general.update'));

-- ── Sales Orders ──
DROP POLICY IF EXISTS "sales_orders_select" ON public.sales_orders;
CREATE POLICY "sales_orders_select" ON public.sales_orders FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'sales.orders.read'));
DROP POLICY IF EXISTS "sales_orders_insert" ON public.sales_orders;
CREATE POLICY "sales_orders_insert" ON public.sales_orders FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'sales.orders.create'));
DROP POLICY IF EXISTS "sales_orders_update" ON public.sales_orders;
CREATE POLICY "sales_orders_update" ON public.sales_orders FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'sales.orders.update'));

-- Sales Order Items (follow parent)
DROP POLICY IF EXISTS "sales_order_items_select" ON public.sales_order_items;
CREATE POLICY "sales_order_items_select" ON public.sales_order_items FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'sales.orders.read'));
DROP POLICY IF EXISTS "sales_order_items_insert" ON public.sales_order_items;
CREATE POLICY "sales_order_items_insert" ON public.sales_order_items FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'sales.orders.create'));

-- ── Sales Returns ──
DROP POLICY IF EXISTS "sales_returns_select" ON public.sales_returns;
CREATE POLICY "sales_returns_select" ON public.sales_returns FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'sales.returns.read'));
DROP POLICY IF EXISTS "sales_returns_insert" ON public.sales_returns;
CREATE POLICY "sales_returns_insert" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'sales.returns.create'));
DROP POLICY IF EXISTS "sales_returns_update" ON public.sales_returns;
CREATE POLICY "sales_returns_update" ON public.sales_returns FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'sales.returns.create'));

DROP POLICY IF EXISTS "sales_return_items_select" ON public.sales_return_items;
CREATE POLICY "sales_return_items_select" ON public.sales_return_items FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'sales.returns.read'));
DROP POLICY IF EXISTS "sales_return_items_insert" ON public.sales_return_items;
CREATE POLICY "sales_return_items_insert" ON public.sales_return_items FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'sales.returns.create'));

-- ── Discounts ──
DROP POLICY IF EXISTS "discount_rules_select" ON public.discount_rules;
CREATE POLICY "discount_rules_select" ON public.discount_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "discount_rules_modify" ON public.discount_rules;
CREATE POLICY "discount_rules_modify" ON public.discount_rules FOR ALL TO authenticated USING (check_permission(auth.uid(), 'sales.discounts.manage')) WITH CHECK (check_permission(auth.uid(), 'sales.discounts.manage'));

DROP POLICY IF EXISTS "discount_rule_items_select" ON public.discount_rule_items;
CREATE POLICY "discount_rule_items_select" ON public.discount_rule_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "discount_rule_items_modify" ON public.discount_rule_items;
CREATE POLICY "discount_rule_items_modify" ON public.discount_rule_items FOR ALL TO authenticated USING (check_permission(auth.uid(), 'sales.discounts.manage')) WITH CHECK (check_permission(auth.uid(), 'sales.discounts.manage'));

-- ── Payment Proofs ──
DROP POLICY IF EXISTS "payment_proofs_select" ON public.payment_proofs;
CREATE POLICY "payment_proofs_select" ON public.payment_proofs FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.collections.read'));
DROP POLICY IF EXISTS "payment_proofs_insert" ON public.payment_proofs;
CREATE POLICY "payment_proofs_insert" ON public.payment_proofs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "payment_proofs_update" ON public.payment_proofs;
CREATE POLICY "payment_proofs_update" ON public.payment_proofs FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'finance.collections.create'));

-- ── Purchase Orders ──
DROP POLICY IF EXISTS "purchase_orders_select" ON public.purchase_orders;
CREATE POLICY "purchase_orders_select" ON public.purchase_orders FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'purchases.orders.read'));
DROP POLICY IF EXISTS "purchase_orders_insert" ON public.purchase_orders;
CREATE POLICY "purchase_orders_insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'purchases.orders.create'));
DROP POLICY IF EXISTS "purchase_orders_update" ON public.purchase_orders;
CREATE POLICY "purchase_orders_update" ON public.purchase_orders FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'purchases.orders.update'));

DROP POLICY IF EXISTS "purchase_order_items_select" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_select" ON public.purchase_order_items FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'purchases.orders.read'));
DROP POLICY IF EXISTS "purchase_order_items_insert" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_insert" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'purchases.orders.create'));

-- ── Purchase Receipts ──
DROP POLICY IF EXISTS "purchase_receipts_select" ON public.purchase_receipts;
CREATE POLICY "purchase_receipts_select" ON public.purchase_receipts FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'purchases.receipts.read'));
DROP POLICY IF EXISTS "purchase_receipts_insert" ON public.purchase_receipts;
CREATE POLICY "purchase_receipts_insert" ON public.purchase_receipts FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'purchases.receipts.create'));
DROP POLICY IF EXISTS "purchase_receipts_update" ON public.purchase_receipts;
CREATE POLICY "purchase_receipts_update" ON public.purchase_receipts FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'purchases.receipts.read'));

DROP POLICY IF EXISTS "purchase_receipt_items_select" ON public.purchase_receipt_items;
CREATE POLICY "purchase_receipt_items_select" ON public.purchase_receipt_items FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'purchases.receipts.read'));
DROP POLICY IF EXISTS "purchase_receipt_items_insert" ON public.purchase_receipt_items;
CREATE POLICY "purchase_receipt_items_insert" ON public.purchase_receipt_items FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'purchases.receipts.create'));

-- ── Purchase Returns ──
DROP POLICY IF EXISTS "purchase_returns_select" ON public.purchase_returns;
CREATE POLICY "purchase_returns_select" ON public.purchase_returns FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'purchases.returns.read'));
DROP POLICY IF EXISTS "purchase_returns_insert" ON public.purchase_returns;
CREATE POLICY "purchase_returns_insert" ON public.purchase_returns FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'purchases.returns.create'));
DROP POLICY IF EXISTS "purchase_returns_update" ON public.purchase_returns;
CREATE POLICY "purchase_returns_update" ON public.purchase_returns FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'purchases.returns.read'));

DROP POLICY IF EXISTS "purchase_return_items_select" ON public.purchase_return_items;
CREATE POLICY "purchase_return_items_select" ON public.purchase_return_items FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'purchases.returns.read'));
DROP POLICY IF EXISTS "purchase_return_items_insert" ON public.purchase_return_items;
CREATE POLICY "purchase_return_items_insert" ON public.purchase_return_items FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'purchases.returns.create'));

-- ── Chart of Accounts ──
DROP POLICY IF EXISTS "coa_select" ON public.chart_of_accounts;
CREATE POLICY "coa_select" ON public.chart_of_accounts FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.accounts.read'));
DROP POLICY IF EXISTS "coa_modify" ON public.chart_of_accounts;
CREATE POLICY "coa_modify" ON public.chart_of_accounts FOR ALL TO authenticated USING (check_permission(auth.uid(), 'finance.accounts.create')) WITH CHECK (check_permission(auth.uid(), 'finance.accounts.create'));

-- ── Fiscal Periods ──
DROP POLICY IF EXISTS "fiscal_periods_select" ON public.fiscal_periods;
CREATE POLICY "fiscal_periods_select" ON public.fiscal_periods FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.periods.read'));
DROP POLICY IF EXISTS "fiscal_periods_modify" ON public.fiscal_periods;
CREATE POLICY "fiscal_periods_modify" ON public.fiscal_periods FOR ALL TO authenticated USING (check_permission(auth.uid(), 'finance.periods.manage')) WITH CHECK (check_permission(auth.uid(), 'finance.periods.manage'));

-- ── Journal Entries ──
DROP POLICY IF EXISTS "journal_entries_select" ON public.journal_entries;
CREATE POLICY "journal_entries_select" ON public.journal_entries FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.entries.read'));
DROP POLICY IF EXISTS "journal_entries_insert" ON public.journal_entries;
CREATE POLICY "journal_entries_insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "journal_entry_lines_select" ON public.journal_entry_lines;
CREATE POLICY "journal_entry_lines_select" ON public.journal_entry_lines FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.entries.read'));
DROP POLICY IF EXISTS "journal_entry_lines_insert" ON public.journal_entry_lines;
CREATE POLICY "journal_entry_lines_insert" ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (true);

-- ── Vaults ──
DROP POLICY IF EXISTS "vaults_select" ON public.vaults;
CREATE POLICY "vaults_select" ON public.vaults FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.vaults.read'));
DROP POLICY IF EXISTS "vaults_modify" ON public.vaults;
CREATE POLICY "vaults_modify" ON public.vaults FOR ALL TO authenticated USING (check_permission(auth.uid(), 'finance.vaults.create')) WITH CHECK (check_permission(auth.uid(), 'finance.vaults.create'));

DROP POLICY IF EXISTS "vault_txn_select" ON public.vault_transactions;
CREATE POLICY "vault_txn_select" ON public.vault_transactions FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.vaults.read'));
DROP POLICY IF EXISTS "vault_txn_insert" ON public.vault_transactions;
CREATE POLICY "vault_txn_insert" ON public.vault_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- ── Custody ──
DROP POLICY IF EXISTS "custody_select" ON public.custody_accounts;
CREATE POLICY "custody_select" ON public.custody_accounts FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.custody.read'));
DROP POLICY IF EXISTS "custody_modify" ON public.custody_accounts;
CREATE POLICY "custody_modify" ON public.custody_accounts FOR ALL TO authenticated USING (check_permission(auth.uid(), 'finance.custody.manage')) WITH CHECK (check_permission(auth.uid(), 'finance.custody.manage'));

DROP POLICY IF EXISTS "custody_txn_select" ON public.custody_transactions;
CREATE POLICY "custody_txn_select" ON public.custody_transactions FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.custody.read'));
DROP POLICY IF EXISTS "custody_txn_insert" ON public.custody_transactions;
CREATE POLICY "custody_txn_insert" ON public.custody_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- ── Expense Categories ──
DROP POLICY IF EXISTS "expense_cats_select" ON public.expense_categories;
CREATE POLICY "expense_cats_select" ON public.expense_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "expense_cats_modify" ON public.expense_categories;
CREATE POLICY "expense_cats_modify" ON public.expense_categories FOR ALL TO authenticated USING (check_permission(auth.uid(), 'finance.expenses.create')) WITH CHECK (check_permission(auth.uid(), 'finance.expenses.create'));

-- ── Expenses ──
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.expenses.read'));
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'finance.expenses.create'));
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (check_permission(auth.uid(), 'finance.expenses.approve'));

-- ── Customer Payments ──
DROP POLICY IF EXISTS "customer_payments_select" ON public.customer_payments;
CREATE POLICY "customer_payments_select" ON public.customer_payments FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.collections.read'));
DROP POLICY IF EXISTS "customer_payments_insert" ON public.customer_payments;
CREATE POLICY "customer_payments_insert" ON public.customer_payments FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'finance.collections.create'));

-- ── Supplier Payments ──
DROP POLICY IF EXISTS "supplier_payments_select" ON public.supplier_payments;
CREATE POLICY "supplier_payments_select" ON public.supplier_payments FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'finance.payments.read'));
DROP POLICY IF EXISTS "supplier_payments_insert" ON public.supplier_payments;
CREATE POLICY "supplier_payments_insert" ON public.supplier_payments FOR INSERT TO authenticated WITH CHECK (check_permission(auth.uid(), 'finance.payments.create'));

-- ── Approval Rules ──
DROP POLICY IF EXISTS "approval_rules_select" ON public.approval_rules;
CREATE POLICY "approval_rules_select" ON public.approval_rules FOR SELECT TO authenticated USING (check_permission(auth.uid(), 'settings.general.read'));
DROP POLICY IF EXISTS "approval_rules_modify" ON public.approval_rules;
CREATE POLICY "approval_rules_modify" ON public.approval_rules FOR ALL TO authenticated USING (check_permission(auth.uid(), 'settings.general.update')) WITH CHECK (check_permission(auth.uid(), 'settings.general.update'));

-- ============================================================
-- 14. SEED DATA — صلاحيات جديدة
-- ============================================================

INSERT INTO public.permissions (module, entity, action, display_name) VALUES
  -- Sales extended
  ('sales', 'orders', 'confirm', 'تأكيد أمر بيع'),
  ('sales', 'orders', 'cancel', 'إلغاء أمر بيع'),
  ('sales', 'returns', 'confirm', 'تأكيد مرتجع'),
  ('sales', 'discounts', 'manage', 'إدارة الخصومات'),
  -- Purchases extended
  ('purchases', 'orders', 'update', 'تعديل أمر شراء'),
  ('purchases', 'receipts', 'approve', 'اعتماد إذن استلام'),
  ('purchases', 'returns', 'create', 'إنشاء مرتجع مشتريات'),
  ('purchases', 'returns', 'read', 'عرض مرتجعات المشتريات'),
  ('purchases', 'returns', 'confirm', 'تأكيد مرتجع مشتريات'),
  -- Finance extended
  ('finance', 'vaults', 'create', 'إنشاء خزنة'),
  ('finance', 'vaults', 'read', 'عرض الخزائن'),
  ('finance', 'vaults', 'update', 'تعديل خزنة'),
  ('finance', 'vaults', 'transfer', 'تحويل بين الخزائن'),
  ('finance', 'custody', 'read', 'عرض العهد'),
  ('finance', 'custody', 'manage', 'إدارة العهد'),
  ('finance', 'expenses', 'create', 'إنشاء مصروف'),
  ('finance', 'expenses', 'read', 'عرض المصروفات'),
  ('finance', 'expenses', 'approve', 'اعتماد مصروف'),
  ('finance', 'periods', 'read', 'عرض الفترات المحاسبية'),
  ('finance', 'periods', 'manage', 'إدارة الفترات المحاسبية'),
  ('finance', 'accounts', 'read', 'عرض شجرة الحسابات'),
  ('finance', 'accounts', 'create', 'إنشاء حساب محاسبي'),
  ('finance', 'entries', 'read', 'عرض القيود المحاسبية'),
  ('finance', 'collections', 'read', 'عرض التحصيلات'),
  ('finance', 'collections', 'create', 'تسجيل تحصيل'),
  ('finance', 'payments', 'read', 'عرض السدادات'),
  ('finance', 'payments', 'create', 'تسجيل سداد'),
  ('finance', 'customer_payments', 'create', 'تسجيل سداد عميل'),
  ('finance', 'customer_payments', 'read', 'عرض سداد العملاء'),
  ('finance', 'supplier_payments', 'create', 'تسجيل سداد مورد'),
  ('finance', 'supplier_payments', 'read', 'عرض سداد الموردين'),
  -- Geography
  ('geography', 'governorates', 'read', 'عرض المحافظات'),
  ('geography', 'cities', 'read', 'عرض المدن'),
  ('geography', 'areas', 'manage', 'إدارة المناطق'),
  ('geography', 'branches', 'create', 'إنشاء فرع'),
  ('geography', 'branches', 'read', 'عرض الفروع'),
  ('geography', 'branches', 'update', 'تعديل فرع')
ON CONFLICT (module, entity, action) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- Assign new permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- 15. SEED DATA — إعدادات الشركة الإضافية
-- ============================================================

INSERT INTO public.company_settings (key, value, category) VALUES
  ('max_discount_percent', '15', 'sales'),
  ('allow_rep_discount', 'true', 'sales'),
  ('require_order_approval', 'false', 'sales'),
  ('default_vault_id', '', 'financial'),
  ('expense_approval_limit_supervisor', '1000', 'financial'),
  ('expense_approval_limit_manager', '5000', 'financial'),
  ('auto_journal_entries', 'true', 'financial')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 16. SEED DATA — شجرة الحسابات الافتراضية
-- ============================================================

INSERT INTO public.chart_of_accounts (code, name, type, is_system) VALUES
  ('1000', 'الأصول', 'asset', true),
  ('1100', 'النقدية والبنوك', 'asset', true),
  ('1200', 'العملاء (ذمم مدينة)', 'asset', true),
  ('1300', 'المخزون', 'asset', true),
  ('1400', 'العهد', 'asset', true),
  ('2000', 'الالتزامات', 'liability', true),
  ('2100', 'الموردين (ذمم دائنة)', 'liability', true),
  ('2200', 'مصروفات مستحقة', 'liability', true),
  ('3000', 'حقوق الملكية', 'equity', true),
  ('3100', 'رأس المال', 'equity', true),
  ('3200', 'أرباح محتجزة', 'equity', true),
  ('4000', 'الإيرادات', 'revenue', true),
  ('4100', 'إيرادات المبيعات', 'revenue', true),
  ('4200', 'إيرادات أخرى', 'revenue', true),
  ('5000', 'المصروفات', 'expense', true),
  ('5100', 'تكلفة البضاعة المباعة', 'expense', true),
  ('5200', 'مصروفات تشغيلية', 'expense', true),
  ('5300', 'مصروفات إدارية', 'expense', true),
  ('5400', 'رواتب وأجور', 'expense', true),
  ('5500', 'عمولات', 'expense', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Set parent references
DO $$ BEGIN
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '1000') WHERE code IN ('1100','1200','1300','1400');
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '2000') WHERE code IN ('2100','2200');
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '3000') WHERE code IN ('3100','3200');
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '4000') WHERE code IN ('4100','4200');
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '5000') WHERE code IN ('5100','5200','5300','5400','5500');
END $$;

-- ============================================================
-- 17. SEED DATA — المحافظات المصرية
-- ============================================================

INSERT INTO public.governorates (name, name_en, sort_order) VALUES
  ('القاهرة', 'Cairo', 1),
  ('الجيزة', 'Giza', 2),
  ('الإسكندرية', 'Alexandria', 3),
  ('الدقهلية', 'Dakahlia', 4),
  ('البحر الأحمر', 'Red Sea', 5),
  ('البحيرة', 'Beheira', 6),
  ('الفيوم', 'Faiyum', 7),
  ('الغربية', 'Gharbia', 8),
  ('الإسماعيلية', 'Ismailia', 9),
  ('المنوفية', 'Monufia', 10),
  ('المنيا', 'Minya', 11),
  ('القليوبية', 'Qalyubia', 12),
  ('الوادي الجديد', 'New Valley', 13),
  ('السويس', 'Suez', 14),
  ('أسوان', 'Aswan', 15),
  ('أسيوط', 'Asyut', 16),
  ('بني سويف', 'Beni Suef', 17),
  ('بورسعيد', 'Port Said', 18),
  ('دمياط', 'Damietta', 19),
  ('الشرقية', 'Sharqia', 20),
  ('جنوب سيناء', 'South Sinai', 21),
  ('كفر الشيخ', 'Kafr El Sheikh', 22),
  ('مطروح', 'Matrouh', 23),
  ('الأقصر', 'Luxor', 24),
  ('قنا', 'Qena', 25),
  ('شمال سيناء', 'North Sinai', 26),
  ('سوهاج', 'Sohag', 27)
ON CONFLICT (name) DO UPDATE SET name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 18. GRANT EXECUTE on new functions
-- ============================================================

GRANT EXECUTE ON FUNCTION generate_order_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_credit_limit(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_price(UUID, UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION can_approve(UUID, approval_type, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_sales_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_sales_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_sales_order(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_purchase_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_purchase_receipt(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_purchase_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_customer_payment(UUID, NUMERIC, payment_method_type, UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_customer_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_customer_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_supplier_payment(UUID, NUMERIC, payment_method_type, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_supplier_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_supplier_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_expense(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_between_vaults(UUID, UUID, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_custody(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_journal_entry(TEXT, UUID, UUID) TO authenticated;

-- ============================================================
-- 22. وظائف إيداع وسحب الخزائن
-- ============================================================

-- 22.1 إيداع في الخزنة
CREATE OR REPLACE FUNCTION vault_deposit(
  p_vault_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
  v_vault_name TEXT;
  v_tx_id UUID;
BEGIN
  -- التحقق من المبلغ
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ الإيداع يجب أن يكون أكبر من صفر';
  END IF;

  -- التحقق من وجود الخزنة ونشاطها
  SELECT name INTO v_vault_name FROM vaults WHERE id = p_vault_id AND is_active = true FOR UPDATE;
  IF v_vault_name IS NULL THEN
    RAISE EXCEPTION 'الخزنة غير موجودة أو غير نشطة';
  END IF;

  -- تحديث رصيد الخزنة
  UPDATE vaults
  SET current_balance = current_balance + p_amount, updated_at = now()
  WHERE id = p_vault_id
  RETURNING current_balance INTO v_new_balance;

  -- تسجيل حركة الإيداع
  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, description, created_by)
  VALUES (p_vault_id, 'deposit', p_amount, v_new_balance, 'vault_deposit', COALESCE(p_description, 'إيداع يدوي'), p_user_id)
  RETURNING id INTO v_tx_id;

  -- إنشاء قيد محاسبي تلقائي
  PERFORM auto_journal_entry('vault_deposit', p_vault_id, p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'vault_name', v_vault_name
  );
END;
$$;

-- 22.2 سحب من الخزنة
CREATE OR REPLACE FUNCTION vault_withdraw(
  p_vault_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current NUMERIC;
  v_new_balance NUMERIC;
  v_vault_name TEXT;
  v_tx_id UUID;
BEGIN
  -- التحقق من المبلغ
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ السحب يجب أن يكون أكبر من صفر';
  END IF;

  -- التحقق من وجود الخزنة ونشاطها + قفل الصف
  SELECT name, current_balance INTO v_vault_name, v_current
  FROM vaults WHERE id = p_vault_id AND is_active = true FOR UPDATE;
  IF v_vault_name IS NULL THEN
    RAISE EXCEPTION 'الخزنة غير موجودة أو غير نشطة';
  END IF;

  -- فحص كفاية الرصيد
  IF v_current < p_amount THEN
    RAISE EXCEPTION 'رصيد الخزنة غير كافٍ — الرصيد الحالي: % والمطلوب: %', v_current, p_amount;
  END IF;

  -- تحديث رصيد الخزنة
  UPDATE vaults
  SET current_balance = current_balance - p_amount, updated_at = now()
  WHERE id = p_vault_id
  RETURNING current_balance INTO v_new_balance;

  -- تسجيل حركة السحب
  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, description, created_by)
  VALUES (p_vault_id, 'withdrawal', -p_amount, v_new_balance, 'vault_withdrawal', COALESCE(p_description, 'سحب يدوي'), p_user_id)
  RETURNING id INTO v_tx_id;

  -- إنشاء قيد محاسبي تلقائي
  PERFORM auto_journal_entry('vault_withdrawal', p_vault_id, p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'vault_name', v_vault_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION vault_deposit(UUID, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION vault_withdraw(UUID, NUMERIC, TEXT, UUID) TO authenticated;

-- ============================================================
-- 10.9 تحميل رصيد عهدة (من خزنة → عهدة)
-- ============================================================
CREATE OR REPLACE FUNCTION custody_load_balance(
  p_custody_id UUID,
  p_vault_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_custody_balance NUMERIC;
  v_custody_max NUMERIC;
  v_vault_balance NUMERIC;
  v_vault_name TEXT;
  v_new_custody_balance NUMERIC;
  v_new_vault_balance NUMERIC;
  v_custody_tx_id UUID;
  v_vault_tx_id UUID;
  v_emp_name TEXT;
BEGIN
  -- التحقق من المبلغ
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التحميل يجب أن يكون أكبر من صفر';
  END IF;

  -- قفل حساب العهدة + التحقق من نشاطه
  SELECT ca.current_balance, ca.max_balance, p.full_name
  INTO v_custody_balance, v_custody_max, v_emp_name
  FROM custody_accounts ca
  JOIN employees e ON e.id = ca.employee_id
  JOIN profiles p ON p.id = e.profile_id
  WHERE ca.id = p_custody_id AND ca.is_active = true
  FOR UPDATE;

  IF v_emp_name IS NULL THEN
    RAISE EXCEPTION 'حساب العهدة غير موجود أو غير نشط';
  END IF;

  -- فحص الحد الأقصى للعهدة
  IF v_custody_max > 0 AND (v_custody_balance + p_amount) > v_custody_max THEN
    RAISE EXCEPTION 'تجاوز الحد الأقصى للعهدة — الحد: % الرصيد الحالي: % المطلوب: %', v_custody_max, v_custody_balance, p_amount;
  END IF;

  -- قفل الخزنة + التحقق من نشاطها ورصيدها
  SELECT name, current_balance INTO v_vault_name, v_vault_balance
  FROM vaults WHERE id = p_vault_id AND is_active = true FOR UPDATE;

  IF v_vault_name IS NULL THEN
    RAISE EXCEPTION 'الخزنة غير موجودة أو غير نشطة';
  END IF;

  IF v_vault_balance < p_amount THEN
    RAISE EXCEPTION 'رصيد الخزنة غير كافٍ — الرصيد: % المطلوب: %', v_vault_balance, p_amount;
  END IF;

  -- خصم من الخزنة
  UPDATE vaults
  SET current_balance = current_balance - p_amount, updated_at = now()
  WHERE id = p_vault_id
  RETURNING current_balance INTO v_new_vault_balance;

  INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
  VALUES (p_vault_id, 'withdrawal', -p_amount, v_new_vault_balance, 'custody_load', p_custody_id, COALESCE(p_description, 'تحميل عهدة — ' || v_emp_name), p_user_id)
  RETURNING id INTO v_vault_tx_id;

  -- إضافة إلى العهدة
  UPDATE custody_accounts
  SET current_balance = current_balance + p_amount, updated_at = now()
  WHERE id = p_custody_id
  RETURNING current_balance INTO v_new_custody_balance;

  INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
  VALUES (p_custody_id, 'load', p_amount, v_new_custody_balance, 'custody_load', p_vault_id, COALESCE(p_description, 'تحميل من خزنة — ' || v_vault_name), p_user_id)
  RETURNING id INTO v_custody_tx_id;

  -- قيد محاسبي تلقائي
  PERFORM auto_journal_entry('custody_load', p_custody_id, p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'custody_tx_id', v_custody_tx_id,
    'vault_tx_id', v_vault_tx_id,
    'new_custody_balance', v_new_custody_balance,
    'new_vault_balance', v_new_vault_balance,
    'employee_name', v_emp_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION custody_load_balance(UUID, UUID, NUMERIC, TEXT, UUID) TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ✅ DONE — Phase 03 Operations Migration Complete
-- ============================================================
-- ملخص:
--   16 ENUM types
--   30 جدول جديد + 4 تعديلات على جداول موجودة
--   23 وظيفة ذرية (SECURITY DEFINER) — شامل إيداع/سحب الخزائن + تحميل العهدة
--   66+ فهرس
--   17 trigger (updated_at) + 9 trigger (audit_log)
--   30 جدول مع RLS + 65+ سياسة أمان
--   40+ صلاحية جديدة
--   شجرة حسابات (20 حساب) + محافظات (27) + إعدادات (7)
--   المدفوعات: pending → confirmed → cancelled (مع عكس الأرصدة)
--   فحص رصيد الخزنة/العهدة قبل كل خصم
-- ============================================================


-- ============================================================
-- HOTFIX — إصلاحات الوظائف التشغيلية
-- تاريخ: 2026-03-17
-- ============================================================

-- FIX 1: confirm_sales_order — حماية البيع النقدي + رسائل خطأ أوضح
CREATE OR REPLACE FUNCTION confirm_sales_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_stock_row RECORD;
BEGIN
  SELECT * INTO v_order FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'أمر البيع غير موجود';  END IF;
  IF v_order.status != 'draft' THEN RAISE EXCEPTION 'أمر البيع ليس في حالة مسودة — الحالة الحالية: %', v_order.status; END IF;

  IF v_order.payment_method != 'cash' THEN
    IF NOT check_credit_limit(v_order.customer_id, v_order.total_amount) THEN
      RAISE EXCEPTION 'تجاوز الحد الائتماني للعميل — المبلغ: % جنيه', v_order.total_amount;
    END IF;
  ELSE
    IF v_order.vault_id IS NULL AND v_order.custody_id IS NULL THEN
      RAISE EXCEPTION 'البيع النقدي يتطلب تحديد خزنة أو حساب عهدة لاستلام المبلغ';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM sales_order_items WHERE order_id = p_order_id LOOP
    SELECT * INTO v_stock_row FROM stock
    WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id FOR UPDATE;

    IF v_stock_row IS NULL OR v_stock_row.quantity < v_item.base_quantity THEN
      RAISE EXCEPTION 'رصيد غير كافي للمنتج (المطلوب: % — المتاح: %)',
        v_item.base_quantity, COALESCE(v_stock_row.quantity, 0);
    END IF;

    UPDATE stock SET quantity = quantity - v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_order.warehouse_id, 'sales_out', -v_item.base_quantity, 'sales_order', p_order_id, p_user_id);
  END LOOP;

  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance + v_order.total_amount, updated_at = now()
    WHERE id = v_order.customer_id;
  ELSE
    IF v_order.vault_id IS NOT NULL THEN
      UPDATE vaults SET current_balance = current_balance + v_order.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'collection', v_order.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_order', p_order_id, 'تحصيل نقدي من أمر بيع', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      UPDATE custody_accounts SET current_balance = current_balance + v_order.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'collection', v_order.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_order', p_order_id, 'تحصيل نقدي من أمر بيع', p_user_id);
    END IF;
  END IF;

  UPDATE sales_orders SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  PERFORM auto_journal_entry('sales_order', p_order_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- FIX 2: approve_purchase_receipt — إصلاح حساب إجمالي الاستلام
CREATE OR REPLACE FUNCTION approve_purchase_receipt(p_receipt_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt RECORD;
  v_po RECORD;
  v_item RECORD;
  v_all_received BOOLEAN;
BEGIN
  SELECT * INTO v_receipt FROM purchase_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF v_receipt IS NULL THEN RAISE EXCEPTION 'إذن الاستلام غير موجود'; END IF;
  IF v_receipt.status != 'pending_approval' THEN RAISE EXCEPTION 'إذن الاستلام ليس في حالة انتظار'; END IF;

  FOR v_item IN SELECT * FROM purchase_receipt_items WHERE receipt_id = p_receipt_id LOOP
    IF v_item.accepted_quantity > 0 THEN
      INSERT INTO stock (product_id, warehouse_id, quantity)
      VALUES (v_item.product_id, v_receipt.warehouse_id, v_item.base_quantity)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
        quantity = stock.quantity + v_item.base_quantity, updated_at = now();

      INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
      VALUES (v_item.product_id, v_receipt.warehouse_id, 'purchase_in', v_item.base_quantity, 'purchase_receipt', p_receipt_id, p_user_id);

      UPDATE purchase_order_items SET received_quantity = received_quantity + v_item.base_quantity
      WHERE id = v_item.order_item_id;
    END IF;
  END LOOP;

  UPDATE purchase_receipts SET status = 'approved', approved_by = p_user_id, approved_at = now(), updated_at = now()
  WHERE id = p_receipt_id;

  SELECT * INTO v_po FROM purchase_orders WHERE id = v_receipt.purchase_order_id FOR UPDATE;

  SELECT NOT EXISTS(
    SELECT 1 FROM purchase_order_items WHERE order_id = v_po.id AND received_quantity < base_quantity
  ) INTO v_all_received;

  IF v_all_received THEN
    UPDATE purchase_orders SET status = 'received', updated_at = now() WHERE id = v_po.id;
  ELSE
    UPDATE purchase_orders SET status = 'partially_received', updated_at = now() WHERE id = v_po.id;
  END IF;

  IF v_po.payment_method != 'cash' THEN
    DECLARE v_receipt_total NUMERIC;
    BEGIN
      SELECT COALESCE(SUM(
        CASE WHEN poi.base_quantity > 0
          THEN (pri.accepted_quantity::NUMERIC / poi.base_quantity::NUMERIC) * poi.total
          ELSE 0
        END
      ), 0) INTO v_receipt_total
      FROM purchase_receipt_items pri
      JOIN purchase_order_items poi ON poi.id = pri.order_item_id
      WHERE pri.receipt_id = p_receipt_id AND pri.accepted_quantity > 0;

      UPDATE suppliers SET current_balance = current_balance + v_receipt_total, updated_at = now()
      WHERE id = v_po.supplier_id;
    END;
  END IF;

  PERFORM auto_journal_entry('purchase_receipt', p_receipt_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'receipt_id', p_receipt_id);
END;
$$;

-- FIX 3: confirm_sales_return — حماية المرتجع النقدي
CREATE OR REPLACE FUNCTION confirm_sales_return(p_return_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_order RECORD;
BEGIN
  SELECT * INTO v_return FROM sales_returns WHERE id = p_return_id FOR UPDATE;
  IF v_return IS NULL THEN RAISE EXCEPTION 'المرتجع غير موجود'; END IF;
  IF v_return.status != 'draft' THEN RAISE EXCEPTION 'المرتجع ليس في حالة مسودة'; END IF;

  SELECT * INTO v_order FROM sales_orders WHERE id = v_return.order_id;

  FOR v_item IN SELECT * FROM sales_return_items WHERE return_id = p_return_id LOOP
    UPDATE stock SET quantity = quantity + v_item.base_quantity, updated_at = now()
    WHERE product_id = v_item.product_id AND warehouse_id = v_return.warehouse_id;

    IF NOT FOUND THEN
      INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (v_item.product_id, v_return.warehouse_id, v_item.base_quantity);
    END IF;

    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (v_item.product_id, v_return.warehouse_id, 'return_in', v_item.base_quantity, 'sales_return', p_return_id, p_user_id);
  END LOOP;

  IF v_order.payment_method != 'cash' THEN
    UPDATE customers SET current_balance = current_balance - v_return.total_amount, updated_at = now()
    WHERE id = v_return.customer_id;
  ELSE
    IF v_order.vault_id IS NOT NULL THEN
      IF (SELECT current_balance FROM vaults WHERE id = v_order.vault_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد الخزنة غير كافٍ لاسترداد المرتجع';
      END IF;
      UPDATE vaults SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.vault_id;
      INSERT INTO vault_transactions (vault_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.vault_id, 'withdrawal', -v_return.total_amount,
        (SELECT current_balance FROM vaults WHERE id = v_order.vault_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSIF v_order.custody_id IS NOT NULL THEN
      IF (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id FOR UPDATE) < v_return.total_amount THEN
        RAISE EXCEPTION 'رصيد العهدة غير كافٍ لاسترداد المرتجع';
      END IF;
      UPDATE custody_accounts SET current_balance = current_balance - v_return.total_amount, updated_at = now()
      WHERE id = v_order.custody_id;
      INSERT INTO custody_transactions (custody_id, type, amount, balance_after, reference_type, reference_id, description, created_by)
      VALUES (v_order.custody_id, 'return', -v_return.total_amount,
        (SELECT current_balance FROM custody_accounts WHERE id = v_order.custody_id),
        'sales_return', p_return_id, 'استرداد مرتجع بيع نقدي', p_user_id);
    ELSE
      RAISE EXCEPTION 'لا يمكن استرداد مبلغ المرتجع النقدي — أمر البيع الأصلي لا يحتوي على خزنة أو عهدة';
    END IF;
  END IF;

  UPDATE sales_returns SET status = 'confirmed', confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_return_id;

  PERFORM auto_journal_entry('sales_return', p_return_id, p_user_id);
  RETURN jsonb_build_object('success', true, 'return_id', p_return_id);
END;
$$;

NOTIFY pgrst, 'reload schema';
