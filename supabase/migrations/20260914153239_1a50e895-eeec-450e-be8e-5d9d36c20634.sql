-- Match history ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  submission_id uuid NOT NULL,
  student_id uuid,
  previous_student_id uuid,
  method text NOT NULL DEFAULT 'auto',
  confidence numeric,
  actor text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.submission_match_events TO authenticated;
GRANT ALL ON public.submission_match_events TO service_role;
ALTER TABLE public.submission_match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read match events"
  ON public.submission_match_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can add match events"
  ON public.submission_match_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_submission_match_events_submission
  ON public.submission_match_events (scope, submission_id, created_at DESC);

-- Remembered corrections ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_match_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL,
  blocked_student_id uuid,
  preferred_student_id uuid,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_overrides_identity_blocked
  ON public.submission_match_overrides (identity_key, COALESCE(blocked_student_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE ON public.submission_match_overrides TO authenticated;
GRANT ALL ON public.submission_match_overrides TO service_role;
ALTER TABLE public.submission_match_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read match overrides"
  ON public.submission_match_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can add match overrides"
  ON public.submission_match_overrides FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update match overrides"
  ON public.submission_match_overrides FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_match_overrides_updated_at
  BEFORE UPDATE ON public.submission_match_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- One invoice per submission ------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_gps_matched_invoice
  ON public.grading_payment_submissions (matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cps_matched_invoice
  ON public.competition_payment_submissions (matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sps_matched_invoice
  ON public.seminar_payment_submissions (matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcps_matched_invoice
  ON public.public_chat_payment_submissions (matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_guards_invoice
  ON public.guards_purchases (invoice_id) WHERE invoice_id IS NOT NULL;

-- One grading per student per term ------------------------------------------
ALTER TABLE public.grading_registrations
  ADD COLUMN IF NOT EXISTS duplicate_override_by text,
  ADD COLUMN IF NOT EXISTS duplicate_override_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_grading_reg_student_term
  ON public.grading_registrations (student_id, term_id)
  WHERE term_id IS NOT NULL AND duplicate_override_by IS NULL;