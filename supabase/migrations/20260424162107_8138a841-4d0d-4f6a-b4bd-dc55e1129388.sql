CREATE TABLE public.grading_term_scorecard_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id text NOT NULL,
  branch_id text NOT NULL,
  label text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term_id, branch_id, label)
);

CREATE INDEX idx_gtsc_term_branch ON public.grading_term_scorecard_columns (term_id, branch_id, position);

ALTER TABLE public.grading_term_scorecard_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scorecard columns"
  ON public.grading_term_scorecard_columns FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert scorecard columns"
  ON public.grading_term_scorecard_columns FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update scorecard columns"
  ON public.grading_term_scorecard_columns FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete scorecard columns"
  ON public.grading_term_scorecard_columns FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_gtsc_updated_at
  BEFORE UPDATE ON public.grading_term_scorecard_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();