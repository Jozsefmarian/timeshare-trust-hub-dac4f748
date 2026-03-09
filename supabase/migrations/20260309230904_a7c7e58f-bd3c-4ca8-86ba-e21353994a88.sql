
-- =====================================================
-- FIX 1: Prevent privilege escalation on profiles
--
-- Problem: profiles_update_own WITH CHECK is just
--   (auth.uid() = id) — users can SET role = 'admin'.
--
-- Fix: Replace the policy so the WITH CHECK also
--   enforces that the role column stays unchanged.
-- =====================================================

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Allow admins to change roles on any profile
CREATE POLICY "profiles_update_admin_role"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
