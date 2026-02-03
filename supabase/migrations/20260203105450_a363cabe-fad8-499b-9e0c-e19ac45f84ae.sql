
-- Fix RLS policies for students, invoices, and entitlements
-- The issue is that policies were referencing auth.users table which requires special permissions
-- Instead, use auth.jwt() to get user email from the JWT token directly

-- Drop and recreate students policy with fixed auth lookup
DROP POLICY IF EXISTS "students_view_own_record" ON public.students;

CREATE POLICY "students_view_own_record"
ON public.students
FOR SELECT
TO authenticated
USING (
  -- Match by email from JWT (no table lookup needed)
  email = auth.jwt() ->> 'email'
  OR 
  -- Match via student_auth link
  id IN (
    SELECT sa.student_id 
    FROM student_auth sa 
    WHERE sa.auth_user_id = auth.uid()
  )
);

-- Drop and recreate invoices policy with fixed auth lookup
DROP POLICY IF EXISTS "students_view_own_invoices" ON public.invoices;

CREATE POLICY "students_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  -- Match by email from JWT via students table
  student_id IN (
    SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
  )
  OR 
  -- Match via student_auth link
  student_id IN (
    SELECT sa.student_id FROM student_auth sa WHERE sa.auth_user_id = auth.uid()
  )
);

-- Drop and recreate entitlements policy with fixed auth lookup
DROP POLICY IF EXISTS "students_view_own_entitlements" ON public.entitlements;

CREATE POLICY "students_view_own_entitlements"
ON public.entitlements
FOR SELECT
TO authenticated
USING (
  -- Match by email from JWT via students table
  student_id IN (
    SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
  )
  OR 
  -- Match via student_auth link
  student_id IN (
    SELECT sa.student_id FROM student_auth sa WHERE sa.auth_user_id = auth.uid()
  )
);

-- Also fix student_auth policy
DROP POLICY IF EXISTS "Students can view their own auth" ON public.student_auth;

CREATE POLICY "Students can view their own auth"
ON public.student_auth
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid() 
  OR email = auth.jwt() ->> 'email'
);
