
-- ============ Tighten INSERT policies on request tables ============
DROP POLICY IF EXISTS "Authenticated users can create invoice deletion requests" ON public.invoice_deletion_requests;
CREATE POLICY "Users can create own invoice deletion requests"
  ON public.invoice_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by_email = auth.email());

DROP POLICY IF EXISTS "Authenticated users can create deletion requests" ON public.payment_deletion_requests;
CREATE POLICY "Users can create own payment deletion requests"
  ON public.payment_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by_email = auth.email());

DROP POLICY IF EXISTS "Authenticated users can insert discount approvals" ON public.invoice_discount_approvals;
CREATE POLICY "Users can create own discount approvals"
  ON public.invoice_discount_approvals FOR INSERT TO authenticated
  WITH CHECK (requested_by_email = auth.email());

DROP POLICY IF EXISTS "Authenticated users can insert action requests" ON public.invoice_action_requests;
CREATE POLICY "Users can create own action requests"
  ON public.invoice_action_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by_email = auth.email());

DROP POLICY IF EXISTS "Authenticated users can create edit requests" ON public.slot_booking_edit_requests;
CREATE POLICY "Staff can create edit requests"
  ON public.slot_booking_edit_requests FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR get_current_employee_id() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can create deletion requests" ON public.grading_deletion_requests;
CREATE POLICY "Users can create own grading deletion requests"
  ON public.grading_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by_email = auth.email());

-- ============ Notice payments — require paid_by_email matches caller ============
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.notice_payments;
CREATE POLICY "Users can insert own notice payments"
  ON public.notice_payments FOR INSERT TO authenticated
  WITH CHECK (
    paid_by_email = auth.email()
    OR get_current_user_role() = 'superadmin'
    OR has_branch_access()
  );

-- ============ Inventory orders — restrict to admin/superadmin ============
DROP POLICY IF EXISTS "Allow authenticated users to create inventory orders" ON public.inventory_orders;
DROP POLICY IF EXISTS "Allow authenticated users to update inventory orders" ON public.inventory_orders;
CREATE POLICY "Admins can create inventory orders"
  ON public.inventory_orders FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR has_admin_access('employees')
    OR get_current_employee_id() IS NOT NULL
  );
CREATE POLICY "Admins can update inventory orders"
  ON public.inventory_orders FOR UPDATE TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR get_current_employee_id() IS NOT NULL
  )
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR get_current_employee_id() IS NOT NULL
  );

-- ============ Superadmin users — block public INSERT ============
DROP POLICY IF EXISTS "System can insert superadmin users" ON public.superadmin_users;
CREATE POLICY "Only superadmins can insert superadmin users"
  ON public.superadmin_users FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() = 'superadmin');

-- ============ Add SET search_path to remaining functions ============
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.superadmin_users WHERE employee_email = auth.email() AND is_active = true) THEN 'superadmin'
      WHEN EXISTS (SELECT 1 FROM public.admin_access aa 
                   JOIN public.employees e ON aa.employee_id = e.id 
                   WHERE e.email = auth.email() AND (aa.employees OR aa.payroll OR aa.leave_management OR aa.claims OR aa.attendance OR aa.slot_booking OR aa.reports)) THEN 'admin'
      ELSE 'employee'
    END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT id FROM public.employees WHERE email = auth.email();
$function$;

CREATE OR REPLACE FUNCTION public.has_admin_access(permission_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_access aa 
    JOIN public.employees e ON aa.employee_id = e.id 
    WHERE e.email = auth.email() 
    AND CASE permission_type
      WHEN 'employees' THEN aa.employees
      WHEN 'payroll' THEN aa.payroll
      WHEN 'leave_management' THEN aa.leave_management
      WHEN 'claims' THEN aa.claims
      WHEN 'attendance' THEN aa.attendance
      WHEN 'slotBooking' THEN aa."slotBooking"
      WHEN 'reports' THEN aa.reports
      ELSE false
    END = true
  );
$function$;

-- ============ Revoke EXECUTE on sensitive admin/aggregation functions ============
REVOKE EXECUTE ON FUNCTION public.get_eligible_employees_with_entitlements(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_unused_leave_for_encashment(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_leave_encashment(text, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_book_ryan_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_book_eldon_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(text, text, text) FROM anon, authenticated;
