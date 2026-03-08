-- Fix 4: Recreate active_employees view with security_invoker
DROP VIEW IF EXISTS public.active_employees;
CREATE VIEW public.active_employees
WITH (security_invoker = true) AS
SELECT id, name, nric, date_of_birth, residency_status, type,
       base_salary, hourly_rate, payment_type, bank_account, bank_name,
       department, position, phone, address, email,
       created_at, updated_at, resign_date, join_date,
       qualifications, display_name
FROM public.employees
WHERE resign_date IS NULL;

-- Fix 5: Revoke sensitive RPC functions from public access
REVOKE EXECUTE ON FUNCTION public.force_book_ryan_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_book_eldon_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(text, text, text) FROM anon;