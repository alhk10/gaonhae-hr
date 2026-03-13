
-- Create student_credits table
CREATE TABLE public.student_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('overpayment', 'refund', 'manual_adjustment', 'credit_applied')),
  reference_id text,
  description text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast balance lookups
CREATE INDEX idx_student_credits_student_id ON public.student_credits(student_id);
CREATE INDEX idx_student_credits_type ON public.student_credits(type);

-- Enable RLS
ALTER TABLE public.student_credits ENABLE ROW LEVEL SECURITY;

-- Superadmins: full access
CREATE POLICY "Superadmins can manage all student credits"
ON public.student_credits
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

-- Staff with sales access: select and insert
CREATE POLICY "Sales staff can view student credits"
ON public.student_credits
FOR SELECT
TO authenticated
USING (public.has_sales_access());

CREATE POLICY "Sales staff can insert student credits"
ON public.student_credits
FOR INSERT
TO authenticated
WITH CHECK (public.has_sales_access());

-- Students can view their own credits
CREATE POLICY "Students can view own credits"
ON public.student_credits
FOR SELECT
TO authenticated
USING (student_id = public.get_current_student_id());
