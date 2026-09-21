REVOKE EXECUTE ON FUNCTION public.get_submission_match_event_detail(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_correct_submission_match(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_submission_match_event_detail(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_correct_submission_match(uuid, uuid, text) TO authenticated, service_role;