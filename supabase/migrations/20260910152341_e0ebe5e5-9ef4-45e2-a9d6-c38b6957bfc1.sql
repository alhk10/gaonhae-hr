REVOKE EXECUTE ON FUNCTION public._remember_student_email(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._remember_student_email(uuid, text) TO service_role;