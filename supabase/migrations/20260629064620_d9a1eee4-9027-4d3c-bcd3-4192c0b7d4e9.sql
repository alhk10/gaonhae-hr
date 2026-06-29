
-- Revoke Klara portal access for albertcorpuz873@gmail.com (EMP1750865290864)

-- 1. Delete the Supabase auth identity so login/refresh is blocked immediately
DELETE FROM auth.users WHERE lower(email) = 'albertcorpuz873@gmail.com';

-- 2. Remove the stray student_auth link for this email
DELETE FROM public.student_auth WHERE lower(email) = 'albertcorpuz873@gmail.com';

-- 3. Mark the employee as resigned today and clear the email so the legacy
--    email-based lookup cannot rebind a new auth user to this record.
UPDATE public.employees
SET resign_date = CURRENT_DATE,
    email = NULL,
    updated_at = now()
WHERE id = 'EMP1750865290864';
