
-- Fix function search_path warnings
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.log_case_status_change() SET search_path = public;

-- Add RLS policies for remaining tables

-- resorts: read for all authenticated, write for admin
ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resorts_select_authenticated" ON public.resorts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "resorts_insert_admin" ON public.resorts
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "resorts_update_admin" ON public.resorts
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- classification_rules: admin only
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classification_rules_select_admin" ON public.classification_rules
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "classification_rules_insert_admin" ON public.classification_rules
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "classification_rules_update_admin" ON public.classification_rules
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- restriction_rules: admin only
ALTER TABLE public.restriction_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restriction_rules_select_admin" ON public.restriction_rules
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "restriction_rules_insert_admin" ON public.restriction_rules
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "restriction_rules_update_admin" ON public.restriction_rules
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- policy_versions: admin only
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_versions_select_admin" ON public.policy_versions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "policy_versions_insert_admin" ON public.policy_versions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "policy_versions_update_admin" ON public.policy_versions
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- service_agreements: read for authenticated, write for admin
ALTER TABLE public.service_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_agreements_select_authenticated" ON public.service_agreements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_agreements_insert_admin" ON public.service_agreements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "service_agreements_update_admin" ON public.service_agreements
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- declaration_acceptances: seller own, admin all
ALTER TABLE public.declaration_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "declaration_acceptances_select_admin" ON public.declaration_acceptances
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "declaration_acceptances_select_seller_own" ON public.declaration_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "declaration_acceptances_insert_own" ON public.declaration_acceptances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- week_offers: seller own case, admin all
ALTER TABLE public.week_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "week_offers_select_admin" ON public.week_offers
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "week_offers_select_seller_own" ON public.week_offers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = week_offers.case_id AND cases.seller_user_id = auth.uid()));
CREATE POLICY "week_offers_insert_seller_own" ON public.week_offers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = week_offers.case_id AND cases.seller_user_id = auth.uid()));
CREATE POLICY "week_offers_insert_admin" ON public.week_offers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "week_offers_update_admin" ON public.week_offers
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- week_assets: admin only
ALTER TABLE public.week_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "week_assets_select_admin" ON public.week_assets
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "week_assets_insert_admin" ON public.week_assets
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "week_assets_update_admin" ON public.week_assets
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- yearly_inventory: admin only
ALTER TABLE public.yearly_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yearly_inventory_select_admin" ON public.yearly_inventory
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "yearly_inventory_insert_admin" ON public.yearly_inventory
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "yearly_inventory_update_admin" ON public.yearly_inventory
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
