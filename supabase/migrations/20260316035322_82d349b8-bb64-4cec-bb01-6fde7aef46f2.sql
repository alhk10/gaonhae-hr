-- Fix notice visibility for student portal views used by employees with student-view access
-- and for authenticated student users viewing their own branch notices.
DROP POLICY IF EXISTS notices_select ON public.notices;

CREATE POLICY notices_select
ON public.notices
FOR SELECT
TO public
USING (
  public.get_current_user_role() = 'superadmin'
  OR target_branches IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.employee_branch_access eba
    WHERE eba.employee_id = public.get_current_employee_id()
      AND eba.branch_id = ANY (public.notices.target_branches)
  )
  OR EXISTS (
    SELECT 1
    FROM public.employee_invoice_access eia
    WHERE eia.employee_id = public.get_current_employee_id()
      AND eia.branch_id = ANY (public.notices.target_branches)
  )
  OR created_by_branch_id IN (
    SELECT eba.branch_id
    FROM public.employee_branch_access eba
    WHERE eba.employee_id = public.get_current_employee_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = public.get_current_student_id()
      AND s.branch_id = ANY (COALESCE(public.notices.target_branches, ARRAY[s.branch_id]))
  )
);