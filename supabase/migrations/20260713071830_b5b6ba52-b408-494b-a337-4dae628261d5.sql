
-- 1. Notes: enable RLS + owner policy
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
CREATE POLICY "Users manage own notes"
  ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;

-- 2. claim_types: restrict management to superadmin
DROP POLICY IF EXISTS "Superadmin can manage claim types" ON public.claim_types;
CREATE POLICY "Superadmin can manage claim types"
  ON public.claim_types FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- 3. leave_types: restrict management to superadmin
DROP POLICY IF EXISTS "Superadmin can modify leave types" ON public.leave_types;
CREATE POLICY "Superadmin can modify leave types"
  ON public.leave_types FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- 4. public_holidays: restrict management to superadmin
DROP POLICY IF EXISTS "Superadmin can manage public holidays" ON public.public_holidays;
CREATE POLICY "Superadmin can manage public holidays"
  ON public.public_holidays FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- 5. slot_bookings: restrict to owning employee + superadmin
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.slot_bookings;
CREATE POLICY "Employees view own slot bookings"
  ON public.slot_bookings FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR employee_id = (auth.jwt() ->> 'email')
    OR employee_id = (auth.uid())::text
  );
CREATE POLICY "Employees manage own slot bookings"
  ON public.slot_bookings FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() = 'superadmin'
    OR employee_id = (auth.jwt() ->> 'email')
    OR employee_id = (auth.uid())::text
  );
CREATE POLICY "Employees update own slot bookings"
  ON public.slot_bookings FOR UPDATE TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR employee_id = (auth.jwt() ->> 'email')
    OR employee_id = (auth.uid())::text
  )
  WITH CHECK (
    public.get_current_user_role() = 'superadmin'
    OR employee_id = (auth.jwt() ->> 'email')
    OR employee_id = (auth.uid())::text
  );
CREATE POLICY "Superadmin delete slot bookings"
  ON public.slot_bookings FOR DELETE TO authenticated
  USING (public.get_current_user_role() = 'superadmin');

-- 6. Storage: remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can read documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update in documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from documents bucket" ON storage.objects;

CREATE POLICY "Admins access documents bucket read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));
CREATE POLICY "Admins access documents bucket insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));
CREATE POLICY "Admins access documents bucket update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));
CREATE POLICY "Admins access documents bucket delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));

DROP POLICY IF EXISTS "Allow authenticated users to upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can read payment proofs" ON storage.objects;

CREATE POLICY "Admins read payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));
CREATE POLICY "Admins upload payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));
CREATE POLICY "Admins delete payment proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.get_current_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Auth users can read receipts bucket" ON storage.objects;
CREATE POLICY "Admins read receipts bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (public.get_current_user_role() = 'superadmin' OR public.check_employee_admin_access()));

-- 7. Set search_path on non-extension functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column_students() SET search_path = public;
ALTER FUNCTION public.generate_inventory_order_number() SET search_path = public;
ALTER FUNCTION public.generate_chat_payment_reference() SET search_path = public;
ALTER FUNCTION public.set_chat_payment_reference() SET search_path = public;
