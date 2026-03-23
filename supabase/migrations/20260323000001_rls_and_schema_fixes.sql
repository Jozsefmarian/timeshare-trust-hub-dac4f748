-- ============================================================
-- RLS JAVÍTÁSOK
-- ============================================================

-- 1. Seller olvashatja a saját besorolási eredményét
CREATE POLICY "classifications_select_seller_own"
  ON public.classifications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = classifications.case_id
      AND cases.seller_user_id = auth.uid()
  ));

-- 2. Seller szerkesztheti a saját week_offers sorát (CorrectionPanel-hez kell)
CREATE POLICY "week_offers_update_seller_own"
  ON public.week_offers FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = week_offers.case_id
      AND cases.seller_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = week_offers.case_id
      AND cases.seller_user_id = auth.uid()
  ));

-- 3. Storage RLS javítás: case-documents bucket
--    A régi policy az uid-t kereste az első mappában, de az elérési út:
--    cases/{case_id}/documents/{doc_type}/{fájlnév}
--    Tehát a második mappa a case_id.

DROP POLICY IF EXISTS "case_documents_insert_seller_own" ON storage.objects;
DROP POLICY IF EXISTS "case_documents_select_seller_own" ON storage.objects;
DROP POLICY IF EXISTS "case_documents_insert_admin_all" ON storage.objects;

CREATE POLICY "case_documents_insert_seller_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = 'cases'
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = (storage.foldername(name))[2]::uuid
        AND cases.seller_user_id = auth.uid()
    )
  );

CREATE POLICY "case_documents_select_seller_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = 'cases'
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = (storage.foldername(name))[2]::uuid
        AND cases.seller_user_id = auth.uid()
    )
  );

CREATE POLICY "case_documents_insert_admin_all"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND public.is_admin(auth.uid())
  );

-- ============================================================
-- HIÁNYZÓ TÁBLA: ai_validation_jobs
-- (confirm-document-upload és process-document edge function használja)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_validation_jobs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           uuid        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id       uuid        REFERENCES public.documents(id) ON DELETE CASCADE,
  policy_version_id uuid        REFERENCES public.policy_versions(id),
  job_type          text        NOT NULL DEFAULT 'process_document',
  status            text        NOT NULL DEFAULT 'queued',
  attempt_count     integer     NOT NULL DEFAULT 0,
  input_payload     jsonb,
  output_payload    jsonb,
  error_message     text,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_validation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_validation_jobs_select_admin"
  ON public.ai_validation_jobs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "ai_validation_jobs_select_seller_own"
  ON public.ai_validation_jobs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = ai_validation_jobs.case_id
      AND cases.seller_user_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS set_ai_validation_jobs_updated_at
  ON public.ai_validation_jobs;

CREATE TRIGGER set_ai_validation_jobs_updated_at
  BEFORE UPDATE ON public.ai_validation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HIÁNYZÓ TÁBLA: case_restriction_hits
-- (classify-case és process-document edge function használja)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_restriction_hits (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           uuid        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id       uuid        REFERENCES public.documents(id),
  policy_version_id uuid        REFERENCES public.policy_versions(id),
  rule_id           uuid,
  severity          text,
  action            text,
  matched_text      text,
  excerpt           text,
  page_number       integer,
  details           jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_restriction_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_restriction_hits_select_admin"
  ON public.case_restriction_hits FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "case_restriction_hits_select_seller_own"
  ON public.case_restriction_hits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_restriction_hits.case_id
      AND cases.seller_user_id = auth.uid()
  ));

-- ============================================================
-- HIÁNYZÓ OSZLOPOK: seller_profiles
-- (generate-sale-contract-hoz kell)
-- ============================================================

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS birth_date  date,
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS mother_name text;

-- ============================================================
-- HIÁNYZÓ OSZLOPOK: week_offers
-- (NewCase.tsx és CorrectionPanel ezeket menti)
-- ============================================================

ALTER TABLE public.week_offers
  ADD COLUMN IF NOT EXISTS usage_frequency text DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS usage_parity    text;

-- ============================================================
-- HIÁNYZÓ OSZLOPOK: documents
-- (process-document és confirm-document-upload edge function használja)
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS last_ai_job_id   uuid REFERENCES public.ai_validation_jobs(id),
  ADD COLUMN IF NOT EXISTS extracted_text   jsonb,
  ADD COLUMN IF NOT EXISTS extracted_fields jsonb;
