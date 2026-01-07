-- Create table to track published P&L reports
CREATE TABLE public.published_pl_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, month, year)
);

-- Enable RLS
ALTER TABLE public.published_pl_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view published reports
CREATE POLICY "Authenticated users can view published reports"
ON public.published_pl_reports
FOR SELECT
TO authenticated
USING (true);

-- Policy: Superadmins can insert/update/delete (managed via application logic)
CREATE POLICY "Allow insert for authenticated users"
ON public.published_pl_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.published_pl_reports
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete for authenticated users"
ON public.published_pl_reports
FOR DELETE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_published_pl_reports_lookup ON public.published_pl_reports(branch_id, month, year);