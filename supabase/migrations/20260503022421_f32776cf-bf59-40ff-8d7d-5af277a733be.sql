
-- branch_profit_loss_entries
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.branch_profit_loss_entries;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.branch_profit_loss_entries;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.branch_profit_loss_entries;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.branch_profit_loss_entries;
CREATE POLICY "pnl_entries_select" ON public.branch_profit_loss_entries
  FOR SELECT TO authenticated USING (public.has_branch_access(branch_id));
CREATE POLICY "pnl_entries_superadmin_all" ON public.branch_profit_loss_entries
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- failed_login_attempts
DROP POLICY IF EXISTS "Users can delete failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Users can insert failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Users can view failed login attempts" ON public.failed_login_attempts;
CREATE POLICY "fla_insert_anyone" ON public.failed_login_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "fla_select_superadmin" ON public.failed_login_attempts
  FOR SELECT TO authenticated USING (public.get_current_user_role() = 'superadmin');
CREATE POLICY "fla_delete_superadmin" ON public.failed_login_attempts
  FOR DELETE TO authenticated USING (public.get_current_user_role() = 'superadmin');

-- student_scheduled_classes
DROP POLICY IF EXISTS "Users can delete scheduled classes" ON public.student_scheduled_classes;
DROP POLICY IF EXISTS "Users can insert scheduled classes" ON public.student_scheduled_classes;
DROP POLICY IF EXISTS "Users can update scheduled classes" ON public.student_scheduled_classes;
DROP POLICY IF EXISTS "Users can view all scheduled classes" ON public.student_scheduled_classes;
CREATE POLICY "ssc_select_auth" ON public.student_scheduled_classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ssc_modify_auth" ON public.student_scheduled_classes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ssc_update_auth" ON public.student_scheduled_classes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ssc_delete_auth" ON public.student_scheduled_classes
  FOR DELETE TO authenticated USING (true);

-- monday_holiday_leave_adjustments
DROP POLICY IF EXISTS "All authenticated users can view monday holiday adjustments" ON public.monday_holiday_leave_adjustments;
DROP POLICY IF EXISTS "Superadmin can manage monday holiday adjustments" ON public.monday_holiday_leave_adjustments;
CREATE POLICY "mhla_select_auth" ON public.monday_holiday_leave_adjustments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mhla_superadmin_all" ON public.monday_holiday_leave_adjustments
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- leave_encashment_config
DROP POLICY IF EXISTS "All authenticated users can view encashment config" ON public.leave_encashment_config;
DROP POLICY IF EXISTS "Superadmin can manage encashment config" ON public.leave_encashment_config;
CREATE POLICY "lec_select_auth" ON public.leave_encashment_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lec_superadmin_all" ON public.leave_encashment_config
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- leave_encashment_records
DROP POLICY IF EXISTS "All authenticated users can view encashment records" ON public.leave_encashment_records;
DROP POLICY IF EXISTS "Superadmin can manage encashment records" ON public.leave_encashment_records;
CREATE POLICY "ler_select_auth" ON public.leave_encashment_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ler_superadmin_all" ON public.leave_encashment_records
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- weekly_slot_config
DROP POLICY IF EXISTS "Users can insert weekly slot config" ON public.weekly_slot_config;
DROP POLICY IF EXISTS "Users can update weekly slot config" ON public.weekly_slot_config;
DROP POLICY IF EXISTS "Users can view weekly slot config" ON public.weekly_slot_config;
CREATE POLICY "wsc_select_auth" ON public.weekly_slot_config
  FOR SELECT TO authenticated USING (true);
-- Note: existing "Superadmin can manage weekly slot config" already covers writes.

-- pl_categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.pl_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.pl_categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.pl_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.pl_categories;
CREATE POLICY "plc_select_auth" ON public.pl_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "plc_superadmin_all" ON public.pl_categories
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- system_allowances
DROP POLICY IF EXISTS "Allow full access to system allowances" ON public.system_allowances;
CREATE POLICY "sa_select_auth" ON public.system_allowances
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sa_superadmin_all" ON public.system_allowances
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- system_deductions
DROP POLICY IF EXISTS "Allow full access to system deductions" ON public.system_deductions;
CREATE POLICY "sd_select_auth" ON public.system_deductions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sd_superadmin_all" ON public.system_deductions
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- superadmin_users (remove always-true policy)
DROP POLICY IF EXISTS "Allow reading superadmin status" ON public.superadmin_users;
DROP POLICY IF EXISTS "Allow reading superadmin status by email match" ON public.superadmin_users;
CREATE POLICY "su_select_own" ON public.superadmin_users
  FOR SELECT TO authenticated USING (employee_email = auth.email());

-- employee_page_access (remove always-true policy)
DROP POLICY IF EXISTS "Users can view their own page access" ON public.employee_page_access;

-- documents (require authentication)
DROP POLICY IF EXISTS "Branch staff can delete documents in their branch" ON public.documents;
DROP POLICY IF EXISTS "Branch staff can insert documents in their branch" ON public.documents;
DROP POLICY IF EXISTS "Branch staff can update documents in their branch" ON public.documents;
DROP POLICY IF EXISTS "Branch staff can view documents in their branch" ON public.documents;
CREATE POLICY "doc_select_branch" ON public.documents
  FOR SELECT TO authenticated USING (branch_id IS NULL OR public.has_branch_access(branch_id));
CREATE POLICY "doc_insert_branch" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (branch_id IS NULL OR public.has_branch_access(branch_id));
CREATE POLICY "doc_update_branch" ON public.documents
  FOR UPDATE TO authenticated
  USING (branch_id IS NULL OR public.has_branch_access(branch_id))
  WITH CHECK (branch_id IS NULL OR public.has_branch_access(branch_id));
CREATE POLICY "doc_delete_branch" ON public.documents
  FOR DELETE TO authenticated USING (branch_id IS NULL OR public.has_branch_access(branch_id));

-- invoice_action_requests: restrict update to superadmin
DROP POLICY IF EXISTS "Superadmins can update action requests" ON public.invoice_action_requests;
CREATE POLICY "iar_update_superadmin" ON public.invoice_action_requests
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- invoices: fix WITH CHECK bug (eia.branch_id = eia.branch_id -> compare against invoices)
DROP POLICY IF EXISTS "invoice_access_insert_invoices" ON public.invoices;
CREATE POLICY "invoice_access_insert_invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
      AND eia.can_create = true
      AND eia.branch_id = invoices.branch_id
  ));

DROP POLICY IF EXISTS "invoice_access_update_invoices" ON public.invoices;
CREATE POLICY "invoice_access_update_invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
      AND eia.can_edit = true
      AND eia.branch_id = invoices.branch_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
      AND eia.can_edit = true
      AND eia.branch_id = invoices.branch_id
  ));
