
-- Allow superadmins and sales-access employees to update any student
CREATE POLICY "staff_update_students"
  ON public.students FOR UPDATE
  USING (get_current_user_role() = 'superadmin' OR has_sales_access())
  WITH CHECK (get_current_user_role() = 'superadmin' OR has_sales_access());

-- Allow students to update their own record (student portal)
CREATE POLICY "students_update_own"
  ON public.students FOR UPDATE
  USING (is_student() AND id = get_current_student_id())
  WITH CHECK (is_student() AND id = get_current_student_id());

-- Allow superadmins and sales-access employees to insert students
CREATE POLICY "staff_insert_students"
  ON public.students FOR INSERT
  WITH CHECK (get_current_user_role() = 'superadmin' OR has_sales_access());

-- Allow superadmins to delete students
CREATE POLICY "superadmin_delete_students"
  ON public.students FOR DELETE
  USING (get_current_user_role() = 'superadmin');
