-- Drop the restrictive policy
DROP POLICY IF EXISTS "Students can view their own auth" ON public.student_auth;

-- Create new inclusive policy that allows email OR auth_user_id matching
CREATE POLICY "Students can view their own auth"
ON public.student_auth
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid() 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Link the auth_user_id for alvinleehk@gmail.com
UPDATE public.student_auth 
SET auth_user_id = 'b200a7b2-e4a1-4943-834f-009ac172c8d3'
WHERE email = 'alvinleehk@gmail.com' AND auth_user_id IS NULL;