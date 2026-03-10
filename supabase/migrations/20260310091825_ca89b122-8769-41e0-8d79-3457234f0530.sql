
-- Add RLS policies for tables that now have RLS enabled but no policies

-- audit_logs: admin only
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- case_status_history: admin read all, seller read own case
CREATE POLICY "case_status_history_select_admin" ON public.case_status_history
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "case_status_history_select_seller_own" ON public.case_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_status_history.case_id AND cases.seller_user_id = auth.uid()));

-- check_results: admin read all, seller read own
CREATE POLICY "check_results_select_admin" ON public.check_results
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "check_results_select_seller_own" ON public.check_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = check_results.case_id AND cases.seller_user_id = auth.uid()));
CREATE POLICY "check_results_insert_admin" ON public.check_results
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- classifications: admin only
CREATE POLICY "classifications_select_admin" ON public.classifications
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "classifications_insert_admin" ON public.classifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- contracts: admin read all, seller read own case
CREATE POLICY "contracts_select_admin" ON public.contracts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "contracts_select_seller_own" ON public.contracts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = contracts.case_id AND cases.seller_user_id = auth.uid()));
CREATE POLICY "contracts_insert_admin" ON public.contracts
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "contracts_update_admin" ON public.contracts
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- payments: admin read all, seller read own case
CREATE POLICY "payments_select_admin" ON public.payments
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "payments_select_seller_own" ON public.payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = payments.case_id AND cases.seller_user_id = auth.uid()));
CREATE POLICY "payments_insert_admin" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
