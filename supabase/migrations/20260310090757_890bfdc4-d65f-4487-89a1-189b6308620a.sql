
-- Create ai_validation_results table
CREATE TABLE public.ai_validation_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  validation_status text NOT NULL DEFAULT 'pending',
  field_match_score numeric,
  keyword_flags jsonb DEFAULT '{}',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_validation_results ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "ai_validation_results_select_admin" ON public.ai_validation_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "ai_validation_results_insert_admin" ON public.ai_validation_results
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "ai_validation_results_update_admin" ON public.ai_validation_results
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Seller can view own (via case ownership)
CREATE POLICY "ai_validation_results_select_seller_own" ON public.ai_validation_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = ai_validation_results.case_id AND cases.seller_user_id = auth.uid()));

-- Service role insert (for edge functions) - handled via service role key, no policy needed

-- Updated_at trigger
CREATE TRIGGER set_ai_validation_results_updated_at
  BEFORE UPDATE ON public.ai_validation_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
