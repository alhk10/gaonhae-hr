-- Create grading_slots table
CREATE TABLE public.grading_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  grading_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  examiner_name TEXT,
  belt_levels TEXT[],
  max_capacity INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- Create grading_registrations table
CREATE TABLE public.grading_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_slot_id UUID NOT NULL REFERENCES grading_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES invoice_items(id),
  current_belt TEXT NOT NULL,
  target_belt TEXT NOT NULL,
  result TEXT CHECK (result IN ('pass', 'fail', 'conditional_pass')),
  certificate_issued BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT,
  UNIQUE(grading_slot_id, student_id)
);

-- Enable RLS
ALTER TABLE grading_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for grading_slots
CREATE POLICY "superadmin_manage_grading_slots" ON grading_slots
  FOR ALL USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "authenticated_view_grading_slots" ON grading_slots
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for grading_registrations
CREATE POLICY "superadmin_manage_grading_registrations" ON grading_registrations
  FOR ALL USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "authenticated_view_grading_registrations" ON grading_registrations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "students_view_own_grading_registrations" ON grading_registrations
  FOR SELECT USING (student_id IN (SELECT id FROM students WHERE email = auth.email()));