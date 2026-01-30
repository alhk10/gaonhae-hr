-- Create student_change_logs table to track all changes made to students
CREATE TABLE public.student_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change'
  field_name TEXT, -- The field that was changed (null for create/delete)
  old_value TEXT, -- Previous value (null for create)
  new_value TEXT, -- New value (null for delete)
  changes JSONB, -- Full changes object for batch updates
  changed_by TEXT, -- Employee ID who made the change
  changed_by_email TEXT, -- Email of the user who made the change
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by student
CREATE INDEX idx_student_change_logs_student_id ON public.student_change_logs(student_id);
CREATE INDEX idx_student_change_logs_created_at ON public.student_change_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.student_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Superadmins can manage all change logs
CREATE POLICY "superadmin_manage_student_change_logs"
  ON public.student_change_logs
  FOR ALL
  USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- Authenticated users can insert change logs
CREATE POLICY "authenticated_insert_student_change_logs"
  ON public.student_change_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Students can view their own change logs
CREATE POLICY "students_view_own_change_logs"
  ON public.student_change_logs
  FOR SELECT
  USING (student_id IN (
    SELECT id FROM public.students WHERE email = auth.email()
  ));