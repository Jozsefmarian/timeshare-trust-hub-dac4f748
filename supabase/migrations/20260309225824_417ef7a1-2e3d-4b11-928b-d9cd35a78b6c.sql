
-- =====================================================
-- 1. CREATE document_types TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_document_types_updated_at ON public.document_types;
CREATE TRIGGER set_document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 2. ALTER documents TABLE — add new columns safely
-- =====================================================

-- Add seller_user_id (nullable first, backfill later if needed)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS seller_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add document_type_id (nullable first; will coexist with existing document_type text column)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_type_id uuid REFERENCES public.document_types(id);

-- Add original_file_name (copy from existing file_name as default)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS original_file_name text;

-- Backfill original_file_name from file_name where null
UPDATE public.documents
  SET original_file_name = file_name
  WHERE original_file_name IS NULL AND file_name IS NOT NULL;

-- Add storage_bucket
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'case-documents';

-- Add storage_path (copy from existing file_path as default)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_path text;

-- Backfill storage_path from file_path where null
UPDATE public.documents
  SET storage_path = file_path
  WHERE storage_path IS NULL AND file_path IS NOT NULL;

-- Add file_size_bytes (coexists with existing file_size)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

-- Backfill file_size_bytes from file_size where null
UPDATE public.documents
  SET file_size_bytes = file_size
  WHERE file_size_bytes IS NULL AND file_size IS NOT NULL;

-- Add upload_status
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'uploaded';

-- Add review_status
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';

-- Add ai_status
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'pending';

-- Add uploaded_at
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now();

-- Backfill seller_user_id from cases.seller_user_id where possible
UPDATE public.documents d
  SET seller_user_id = c.seller_user_id
  FROM public.cases c
  WHERE d.case_id = c.id
    AND d.seller_user_id IS NULL;

-- =====================================================
-- 3. CREATE document_versions TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  original_file_name text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'case-documents',
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_no)
);

-- =====================================================
-- 4. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_seller_user_id ON public.documents(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON public.documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
