
-- 1. Create security-definer helper to check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- 2. Fix profiles policies that self-reference (infinite recursion risk)
DROP POLICY IF EXISTS "profiles_update_admin_role" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Admin can update any profile (including role changes)
CREATE POLICY "profiles_update_admin_role" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- User can update own profile but CANNOT change their role
CREATE POLICY "profiles_update_own_no_role" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 3. Fix profiles SELECT - also self-referencing
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Sellers see own profile, admins see all
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Fix cases policies to use is_admin (avoid recursion)
DROP POLICY IF EXISTS "cases_select_admin_all" ON public.cases;
DROP POLICY IF EXISTS "cases_update_admin_all" ON public.cases;

CREATE POLICY "cases_select_admin_all" ON public.cases
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "cases_update_admin_all" ON public.cases
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. Fix documents policies to use is_admin
DROP POLICY IF EXISTS "documents_select_admin_all" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_admin_all" ON public.documents;
DROP POLICY IF EXISTS "documents_update_admin_all" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_admin_only" ON public.documents;

CREATE POLICY "documents_select_admin_all" ON public.documents
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "documents_insert_admin_all" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "documents_update_admin_all" ON public.documents
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "documents_delete_admin_only" ON public.documents
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. Fix document_versions policies to use is_admin
DROP POLICY IF EXISTS "document_versions_select_admin_all" ON public.document_versions;
DROP POLICY IF EXISTS "document_versions_insert_admin_all" ON public.document_versions;
DROP POLICY IF EXISTS "document_versions_delete_admin_only" ON public.document_versions;

CREATE POLICY "document_versions_select_admin_all" ON public.document_versions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "document_versions_insert_admin_all" ON public.document_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "document_versions_delete_admin_only" ON public.document_versions
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7. Fix ai_validation_results policies to use is_admin
DROP POLICY IF EXISTS "ai_validation_results_select_admin" ON public.ai_validation_results;
DROP POLICY IF EXISTS "ai_validation_results_insert_admin" ON public.ai_validation_results;
DROP POLICY IF EXISTS "ai_validation_results_update_admin" ON public.ai_validation_results;

CREATE POLICY "ai_validation_results_select_admin" ON public.ai_validation_results
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "ai_validation_results_insert_admin" ON public.ai_validation_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "ai_validation_results_update_admin" ON public.ai_validation_results
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 8. Fix document_types policies to use is_admin
DROP POLICY IF EXISTS "document_types_insert_admin" ON public.document_types;
DROP POLICY IF EXISTS "document_types_update_admin" ON public.document_types;
DROP POLICY IF EXISTS "document_types_delete_admin" ON public.document_types;

CREATE POLICY "document_types_insert_admin" ON public.document_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "document_types_update_admin" ON public.document_types
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "document_types_delete_admin" ON public.document_types
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 9. Ensure RLS is enabled on all relevant tables
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
