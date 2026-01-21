-- Create branch operating schedule table to track which days each branch operates
CREATE TABLE public.branch_operating_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, weekday)
);

-- Enable RLS
ALTER TABLE public.branch_operating_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "superadmin_manage_branch_operating_schedule" ON public.branch_operating_schedule
  FOR ALL USING (get_current_user_role() = 'superadmin'::text)
  WITH CHECK (get_current_user_role() = 'superadmin'::text);

CREATE POLICY "view_branch_operating_schedule" ON public.branch_operating_schedule
  FOR SELECT USING (true);

-- Create index for faster lookups
CREATE INDEX idx_branch_operating_schedule_branch ON public.branch_operating_schedule(branch_id);