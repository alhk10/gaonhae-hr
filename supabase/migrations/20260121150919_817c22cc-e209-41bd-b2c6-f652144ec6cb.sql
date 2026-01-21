-- Create term_breaks table for break periods within terms
CREATE TABLE public.term_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.term_calendars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- Enable RLS on term_breaks
ALTER TABLE public.term_breaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for term_breaks
CREATE POLICY "superadmin_manage_term_breaks" ON public.term_breaks
  FOR ALL USING (get_current_user_role() = 'superadmin'::text)
  WITH CHECK (get_current_user_role() = 'superadmin'::text);

CREATE POLICY "view_term_breaks" ON public.term_breaks
  FOR SELECT USING (true);

-- Add new columns to term_calendars
ALTER TABLE public.term_calendars 
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS term_number INTEGER,
  ADD COLUMN IF NOT EXISTS grace_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS total_weeks INTEGER;

-- Add term reference to products for term-based validity
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS validity_type TEXT DEFAULT 'months',
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.term_calendars(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_term_breaks_term_id ON public.term_breaks(term_id);
CREATE INDEX IF NOT EXISTS idx_term_calendars_branch_year ON public.term_calendars(branch_id, year);
CREATE INDEX IF NOT EXISTS idx_products_term_id ON public.products(term_id);