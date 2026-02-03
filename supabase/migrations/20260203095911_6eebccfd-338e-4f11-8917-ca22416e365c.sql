-- Update students RLS policy to support both email matching and auth_user_id matching via student_auth
DROP POLICY IF EXISTS "students_view_own_record" ON public.students;

CREATE POLICY "students_view_own_record"
ON public.students
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR id IN (
    SELECT sa.student_id 
    FROM student_auth sa 
    WHERE sa.auth_user_id = auth.uid()
  )
);

-- Update invoices RLS policy for students
DROP POLICY IF EXISTS "students_view_own_invoices" ON public.invoices;

CREATE POLICY "students_view_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR student_id IN (
    SELECT sa.student_id FROM student_auth sa WHERE sa.auth_user_id = auth.uid()
  )
);

-- Update entitlements RLS policy for students
DROP POLICY IF EXISTS "students_view_own_entitlements" ON public.entitlements;

CREATE POLICY "students_view_own_entitlements"
ON public.entitlements
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR student_id IN (
    SELECT sa.student_id FROM student_auth sa WHERE sa.auth_user_id = auth.uid()
  )
);