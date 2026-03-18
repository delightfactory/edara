-- ============================================================================
-- EDARA — Supabase Storage Buckets & RLS Policies (v2 — مُصحّح)
-- ============================================================================
-- هذا السكريبت يُنشئ جميع الـ Buckets اللازمة للنظام مع سياسات أمان كاملة.
--
-- الاستراتيجية:
--   PUBLIC  = صور تُعرض في <img> مباشرة (منتجات، علامات، أفاتار)
--   PRIVATE = مستندات حساسة تحتاج signed URL (عقود، فواتير، مستندات موظفين)
--
-- ⚠️ تنفيذ هذا السكريبت مرة واحدة فقط في Supabase SQL Editor
-- ⚠️ السكريبت آمن للتكرار (idempotent) بفضل ON CONFLICT DO NOTHING
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1: إنشاء الـ Buckets
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. PUBLIC BUCKETS ──────────────────────────────────────────────────────

-- صور المنتجات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- صور التصنيفات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images', 'category-images', true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- شعارات العلامات التجارية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-logos', 'brand-logos', true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- أصول الشركة (الشعار، الختم)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets', 'company-assets', true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- صور المستخدمين (أفاتار)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars', 'user-avatars', true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ── 2. PRIVATE BUCKETS ─────────────────────────────────────────────────────

-- مرفقات العملاء (عقود، مستندات)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-attachments', 'customer-attachments', false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- مرفقات الموردين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-attachments', 'supplier-attachments', false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- مستندات الموظفين (هوية، عقود عمل)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents', 'employee-documents', false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- مرفقات الفواتير
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-attachments', 'invoice-attachments', false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- إيصالات المصروفات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts', 'expense-receipts', false,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- تقارير مصدّرة (PDF, Excel, CSV)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-exports', 'report-exports', false,
  20971520,  -- 20MB
  ARRAY['application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2: سياسات الأمان (RLS Policies)
-- ════════════════════════════════════════════════════════════════════════════
-- ⚡ Performance: نستخدم (select auth.uid()) بدلاً من auth.uid() مباشرة
--    لتجنب إعادة تقييم الدالة لكل صف (best practice من Supabase)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- PUBLIC BUCKETS: القراءة مفتوحة، الكتابة تحتاج مصادقة
-- ────────────────────────────────────────────────────────────────────────────

-- === product-images ===
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- === category-images ===
DROP POLICY IF EXISTS "category_images_select" ON storage.objects;
CREATE POLICY "category_images_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'category-images');

DROP POLICY IF EXISTS "category_images_insert" ON storage.objects;
CREATE POLICY "category_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'category-images');

DROP POLICY IF EXISTS "category_images_update" ON storage.objects;
CREATE POLICY "category_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'category-images')
  WITH CHECK (bucket_id = 'category-images');

DROP POLICY IF EXISTS "category_images_delete" ON storage.objects;
CREATE POLICY "category_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'category-images');

-- === brand-logos ===
DROP POLICY IF EXISTS "brand_logos_select" ON storage.objects;
CREATE POLICY "brand_logos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "brand_logos_insert" ON storage.objects;
CREATE POLICY "brand_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "brand_logos_update" ON storage.objects;
CREATE POLICY "brand_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos')
  WITH CHECK (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "brand_logos_delete" ON storage.objects;
CREATE POLICY "brand_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos');

-- === company-assets ===
DROP POLICY IF EXISTS "company_assets_select" ON storage.objects;
CREATE POLICY "company_assets_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "company_assets_insert" ON storage.objects;
CREATE POLICY "company_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "company_assets_update" ON storage.objects;
CREATE POLICY "company_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets')
  WITH CHECK (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "company_assets_delete" ON storage.objects;
CREATE POLICY "company_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets');

-- === user-avatars (owner-based: المستخدم يرفع فقط في مجلد uid الخاص به) ===
DROP POLICY IF EXISTS "user_avatars_select" ON storage.objects;
CREATE POLICY "user_avatars_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "user_avatars_insert" ON storage.objects;
CREATE POLICY "user_avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "user_avatars_update" ON storage.objects;
CREATE POLICY "user_avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "user_avatars_delete" ON storage.objects;
CREATE POLICY "user_avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ────────────────────────────────────────────────────────────────────────────
-- PRIVATE BUCKETS: كل العمليات تحتاج مصادقة (مع UPDATE policy كاملة)
-- ────────────────────────────────────────────────────────────────────────────

-- === customer-attachments ===
DROP POLICY IF EXISTS "customer_attachments_select" ON storage.objects;
CREATE POLICY "customer_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'customer-attachments');

DROP POLICY IF EXISTS "customer_attachments_insert" ON storage.objects;
CREATE POLICY "customer_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-attachments');

DROP POLICY IF EXISTS "customer_attachments_update" ON storage.objects;
CREATE POLICY "customer_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'customer-attachments')
  WITH CHECK (bucket_id = 'customer-attachments');

DROP POLICY IF EXISTS "customer_attachments_delete" ON storage.objects;
CREATE POLICY "customer_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'customer-attachments');

-- === supplier-attachments ===
DROP POLICY IF EXISTS "supplier_attachments_select" ON storage.objects;
CREATE POLICY "supplier_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-attachments');

DROP POLICY IF EXISTS "supplier_attachments_insert" ON storage.objects;
CREATE POLICY "supplier_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-attachments');

DROP POLICY IF EXISTS "supplier_attachments_update" ON storage.objects;
CREATE POLICY "supplier_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'supplier-attachments')
  WITH CHECK (bucket_id = 'supplier-attachments');

DROP POLICY IF EXISTS "supplier_attachments_delete" ON storage.objects;
CREATE POLICY "supplier_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'supplier-attachments');

-- === employee-documents ===
DROP POLICY IF EXISTS "employee_documents_select" ON storage.objects;
CREATE POLICY "employee_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "employee_documents_insert" ON storage.objects;
CREATE POLICY "employee_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "employee_documents_update" ON storage.objects;
CREATE POLICY "employee_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-documents')
  WITH CHECK (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "employee_documents_delete" ON storage.objects;
CREATE POLICY "employee_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'employee-documents');

-- === invoice-attachments ===
DROP POLICY IF EXISTS "invoice_attachments_select" ON storage.objects;
CREATE POLICY "invoice_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-attachments');

DROP POLICY IF EXISTS "invoice_attachments_insert" ON storage.objects;
CREATE POLICY "invoice_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-attachments');

DROP POLICY IF EXISTS "invoice_attachments_update" ON storage.objects;
CREATE POLICY "invoice_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-attachments')
  WITH CHECK (bucket_id = 'invoice-attachments');

DROP POLICY IF EXISTS "invoice_attachments_delete" ON storage.objects;
CREATE POLICY "invoice_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'invoice-attachments');

-- === expense-receipts ===
DROP POLICY IF EXISTS "expense_receipts_select" ON storage.objects;
CREATE POLICY "expense_receipts_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "expense_receipts_insert" ON storage.objects;
CREATE POLICY "expense_receipts_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "expense_receipts_update" ON storage.objects;
CREATE POLICY "expense_receipts_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'expense-receipts')
  WITH CHECK (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "expense_receipts_delete" ON storage.objects;
CREATE POLICY "expense_receipts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'expense-receipts');

-- === report-exports ===
DROP POLICY IF EXISTS "report_exports_select" ON storage.objects;
CREATE POLICY "report_exports_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-exports');

DROP POLICY IF EXISTS "report_exports_insert" ON storage.objects;
CREATE POLICY "report_exports_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-exports');

DROP POLICY IF EXISTS "report_exports_update" ON storage.objects;
CREATE POLICY "report_exports_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'report-exports')
  WITH CHECK (bucket_id = 'report-exports');

DROP POLICY IF EXISTS "report_exports_delete" ON storage.objects;
CREATE POLICY "report_exports_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'report-exports');

COMMIT;

-- ============================================================================
-- ✅ DONE — 11 buckets + 44 RLS policies created successfully
-- ============================================================================
-- ملخص:
--   5 PUBLIC buckets  (product-images, category-images, brand-logos, company-assets, user-avatars)
--   6 PRIVATE buckets (customer-attachments, supplier-attachments, employee-documents,
--                      invoice-attachments, expense-receipts, report-exports)
--   كل bucket لديه 4 سياسات: SELECT, INSERT, UPDATE, DELETE
--   user-avatars لديه owner-based path restriction (المستخدم يرفع في مجلد uid/)
-- ============================================================================
