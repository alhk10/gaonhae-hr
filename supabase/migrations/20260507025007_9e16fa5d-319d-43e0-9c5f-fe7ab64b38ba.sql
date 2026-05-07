
-- ============ STUDENTS: fix branch check bug ============
DROP POLICY IF EXISTS "staff_insert_students" ON public.students;
CREATE POLICY "staff_insert_students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR has_sales_access()
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
        AND eia.can_create = true
        AND eia.branch_id = students.branch_id
    )
  );

-- ============ STUDENT CLASS ENROLLMENTS ============
DROP POLICY IF EXISTS "Authenticated users can insert enrollments" ON public.student_class_enrollments;
DROP POLICY IF EXISTS "Authenticated users can update enrollments" ON public.student_class_enrollments;

CREATE POLICY "Staff can insert enrollments" ON public.student_class_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR has_branch_access(branch_id)
  );

CREATE POLICY "Staff can update enrollments" ON public.student_class_enrollments
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR has_branch_access(branch_id)
  )
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR has_branch_access(branch_id)
  );

CREATE POLICY "Staff can delete enrollments" ON public.student_class_enrollments
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR has_branch_access(branch_id)
  );

-- ============ STUDENT SCHEDULED CLASSES ============
DROP POLICY IF EXISTS "ssc_select_auth" ON public.student_scheduled_classes;
DROP POLICY IF EXISTS "ssc_modify_auth" ON public.student_scheduled_classes;
DROP POLICY IF EXISTS "ssc_update_auth" ON public.student_scheduled_classes;
DROP POLICY IF EXISTS "ssc_delete_auth" ON public.student_scheduled_classes;

CREATE POLICY "ssc_select" ON public.student_scheduled_classes
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.id = student_scheduled_classes.enrollment_id
        AND has_branch_access(sce.branch_id)
    )
    OR EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      JOIN students s ON s.id = sce.student_id
      WHERE sce.id = student_scheduled_classes.enrollment_id
        AND (s.email = auth.email() OR s.id = get_current_student_id())
    )
  );

CREATE POLICY "ssc_insert" ON public.student_scheduled_classes
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.id = enrollment_id AND has_branch_access(sce.branch_id)
    )
  );

CREATE POLICY "ssc_update" ON public.student_scheduled_classes
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.id = enrollment_id AND has_branch_access(sce.branch_id)
    )
  )
  WITH CHECK (
    get_current_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.id = enrollment_id AND has_branch_access(sce.branch_id)
    )
  );

CREATE POLICY "ssc_delete" ON public.student_scheduled_classes
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.id = enrollment_id AND has_branch_access(sce.branch_id)
    )
  );

-- ============ GRADING SCORECARD COLUMNS ============
DROP POLICY IF EXISTS "Authenticated can insert scorecard columns" ON public.grading_term_scorecard_columns;
DROP POLICY IF EXISTS "Authenticated can update scorecard columns" ON public.grading_term_scorecard_columns;
DROP POLICY IF EXISTS "Authenticated can delete scorecard columns" ON public.grading_term_scorecard_columns;

CREATE POLICY "Superadmin manage scorecard columns" ON public.grading_term_scorecard_columns
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- ============ PUBLISHED P&L REPORTS ============
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.published_pl_reports;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.published_pl_reports;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.published_pl_reports;

CREATE POLICY "Superadmin manage published reports" ON public.published_pl_reports
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- ============ LETTER TEMPLATES ============
DROP POLICY IF EXISTS "Authenticated users can insert letter templates" ON public.letter_templates;
DROP POLICY IF EXISTS "Authenticated users can update letter templates" ON public.letter_templates;
DROP POLICY IF EXISTS "Authenticated users can delete letter templates" ON public.letter_templates;

CREATE POLICY "Superadmin insert letter templates" ON public.letter_templates
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin update letter templates" ON public.letter_templates
  FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin delete letter templates" ON public.letter_templates
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'superadmin' AND is_default = false);

-- ============ SLOT BOOKING EDIT REQUESTS ============
DROP POLICY IF EXISTS "Authenticated users can update edit requests" ON public.slot_booking_edit_requests;
CREATE POLICY "Superadmin update edit requests" ON public.slot_booking_edit_requests
  FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- ============ GRADING DELETION REQUESTS ============
DROP POLICY IF EXISTS "Authenticated users can update deletion requests" ON public.grading_deletion_requests;
CREATE POLICY "Superadmin update deletion requests" ON public.grading_deletion_requests
  FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- ============ INVOICE ACTION REQUESTS ============
DROP POLICY IF EXISTS "Superadmins and admins can view all action requests" ON public.invoice_action_requests;

CREATE POLICY "View invoice action requests" ON public.invoice_action_requests
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR requested_by_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
    )
  );

-- ============ LEAVE ENCASHMENT CONFIG ============
DROP POLICY IF EXISTS "lec_select_auth" ON public.leave_encashment_config;
CREATE POLICY "lec_select_owner_or_payroll" ON public.leave_encashment_config
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR has_admin_access('payroll')
    OR employee_id = get_current_employee_id()
  );

-- ============ LEAVE ENCASHMENT RECORDS ============
DROP POLICY IF EXISTS "ler_select_auth" ON public.leave_encashment_records;
CREATE POLICY "ler_select_owner_or_payroll" ON public.leave_encashment_records
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR has_admin_access('payroll')
    OR employee_id = get_current_employee_id()
  );

-- ============ MONDAY HOLIDAY LEAVE ADJUSTMENTS ============
DROP POLICY IF EXISTS "mhla_select_auth" ON public.monday_holiday_leave_adjustments;
CREATE POLICY "mhla_select_owner_or_payroll" ON public.monday_holiday_leave_adjustments
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'superadmin'
    OR has_admin_access('payroll')
    OR has_admin_access('leave_management')
    OR employee_id = get_current_employee_id()
  );

-- ============ CLAIMS: prevent self-approval ============
DROP POLICY IF EXISTS "Employees can create claims" ON public.claims;

CREATE POLICY "Employees can create pending claims" ON public.claims
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = get_current_employee_id()
    AND status = 'Pending'
  );

-- Helper: check if current user is a partner (case-insensitive)
CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE email = auth.email()
      AND upper(coalesce(position,'')) IN ('PARTNER','SENIOR PARTNER')
  );
$$;

-- Partner self-approval RPC: validates caller is a partner before inserting approved claim
CREATE OR REPLACE FUNCTION public.partner_create_approved_claim(
  p_type text,
  p_amount numeric,
  p_description text,
  p_submitted_date date,
  p_receipt_url text,
  p_branch_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp_id text;
  v_id uuid;
BEGIN
  v_emp_id := get_current_employee_id();
  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT is_partner() THEN
    RAISE EXCEPTION 'Only partners can record auto-approved claims';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  INSERT INTO claims (
    employee_id, type, amount, description, status,
    submitted_date, reviewed_date, reviewed_by, receipt_url, branch_id
  ) VALUES (
    v_emp_id, p_type, p_amount, p_description, 'Approved',
    p_submitted_date, now(), v_emp_id, p_receipt_url, p_branch_id
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.partner_create_approved_claim(text, numeric, text, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.partner_create_approved_claim(text, numeric, text, date, text, text) TO authenticated;

-- ============ STORAGE BUCKETS: privatize ============
UPDATE storage.buckets SET public = false
WHERE id IN ('claim-receipts','payment-proofs','receipts','student-photos','notice-attachments');

-- Drop overly permissive public SELECT policies on storage.objects
DROP POLICY IF EXISTS "Allow public read access for payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to receipts" ON storage.objects;
DROP POLICY IF EXISTS "Student photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "notice_attachments_select" ON storage.objects;

-- New authenticated-only SELECT policies
CREATE POLICY "Auth users can read payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Auth users can read claim receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-receipts'
    AND (
      get_current_user_role() = 'superadmin'
      OR has_admin_access('claims')
      OR has_admin_access('payroll')
      OR (auth.uid())::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Auth users can read receipts bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Auth users can read student photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "Auth users can read notice attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notice-attachments');
