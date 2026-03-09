
GRANT EXECUTE ON FUNCTION public.get_employee_by_email_for_auth(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_by_auth_id_for_auth(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_linked_students_for_auth(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_access_for_auth(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_page_access_for_auth(text) TO authenticated;
