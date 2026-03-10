
-- Add missing columns to contracts table
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS generated_file_name text,
  ADD COLUMN IF NOT EXISTS generated_storage_bucket text DEFAULT 'generated-contracts',
  ADD COLUMN IF NOT EXISTS generated_storage_path text,
  ADD COLUMN IF NOT EXISTS signed_file_name text,
  ADD COLUMN IF NOT EXISTS signed_storage_bucket text DEFAULT 'signed-contracts',
  ADD COLUMN IF NOT EXISTS signed_storage_path text;

-- Add RLS policies for sellers to read and update their own contracts
CREATE POLICY "contracts_update_seller_signed_upload"
  ON public.contracts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = contracts.case_id AND cases.seller_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = contracts.case_id AND cases.seller_user_id = auth.uid()));

-- Storage RLS for generated-contracts bucket
CREATE POLICY "generated_contracts_select_admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generated-contracts' AND public.is_admin(auth.uid()));

CREATE POLICY "generated_contracts_select_seller_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-contracts'
    AND (storage.foldername(name))[1] = 'cases'
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = (storage.foldername(name))[2]::uuid
        AND cases.seller_user_id = auth.uid()
    )
  );

CREATE POLICY "generated_contracts_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-contracts' AND public.is_admin(auth.uid()));

-- Storage RLS for signed-contracts bucket
CREATE POLICY "signed_contracts_select_admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signed-contracts' AND public.is_admin(auth.uid()));

CREATE POLICY "signed_contracts_select_seller_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signed-contracts'
    AND (storage.foldername(name))[1] = 'cases'
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = (storage.foldername(name))[2]::uuid
        AND cases.seller_user_id = auth.uid()
    )
  );

CREATE POLICY "signed_contracts_insert_seller_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signed-contracts'
    AND (storage.foldername(name))[1] = 'cases'
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = (storage.foldername(name))[2]::uuid
        AND cases.seller_user_id = auth.uid()
    )
  );

CREATE POLICY "signed_contracts_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signed-contracts' AND public.is_admin(auth.uid()));
