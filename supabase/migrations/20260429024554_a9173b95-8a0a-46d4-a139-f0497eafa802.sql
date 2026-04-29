-- Accounting backfill runs (Phase 3)
CREATE TABLE IF NOT EXISTS public.accounting_backfill_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  run_by TEXT,
  modules TEXT[] NOT NULL DEFAULT '{}',
  from_date DATE,
  to_date DATE,
  force BOOLEAN NOT NULL DEFAULT false,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_backfill_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins manage backfill runs" ON public.accounting_backfill_runs;
CREATE POLICY "Superadmins manage backfill runs"
  ON public.accounting_backfill_runs
  FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE INDEX IF NOT EXISTS idx_accounting_backfill_runs_run_at
  ON public.accounting_backfill_runs (run_at DESC);

-- Helpful index for idempotency on automated postings
CREATE INDEX IF NOT EXISTS idx_journal_entries_source
  ON public.journal_entries (source_type, source_id, status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference
  ON public.journal_entries (reference);