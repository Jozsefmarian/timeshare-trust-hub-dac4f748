
-- =====================================================
-- 1. ENABLE RLS ON ALL THREE TABLES
-- =====================================================
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. document_types — readable by all authenticated, writable by admins
-- =====================================================
CREATE POLICY "document_types_select_authenticated"
  ON public.document_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "document_types_insert_admin"
  ON public.document_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "document_types_update_admin"
  ON public.document_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "document_types_delete_admin"
  ON public.document_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 3. documents — sellers own, admins all
-- =====================================================
CREATE POLICY "documents_select_seller_own"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    seller_user_id = auth.uid()
  );

CREATE POLICY "documents_select_admin_all"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "documents_insert_seller_own"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE id = case_id AND seller_user_id = auth.uid()
    )
  );

CREATE POLICY "documents_insert_admin_all"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "documents_update_seller_own"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (seller_user_id = auth.uid())
  WITH CHECK (seller_user_id = auth.uid());

CREATE POLICY "documents_update_admin_all"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "documents_delete_admin_only"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 4. document_versions — follows parent document access
-- =====================================================
CREATE POLICY "document_versions_select_seller_own"
  ON public.document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_versions.document_id
        AND seller_user_id = auth.uid()
    )
  );

CREATE POLICY "document_versions_select_admin_all"
  ON public.document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "document_versions_insert_seller_own"
  ON public.document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_versions.document_id
        AND seller_user_id = auth.uid()
    )
  );

CREATE POLICY "document_versions_insert_admin_all"
  ON public.document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "document_versions_delete_admin_only"
  ON public.document_versions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. Storage policies for case-documents bucket
-- =====================================================

-- Sellers can upload to their own path: {user_id}/...
CREATE POLICY "case_documents_insert_seller_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sellers can read their own files
CREATE POLICY "case_documents_select_seller_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all files in the bucket
CREATE POLICY "case_documents_select_admin_all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can upload/manage all files
CREATE POLICY "case_documents_insert_admin_all"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete files
CREATE POLICY "case_documents_delete_admin_all"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
