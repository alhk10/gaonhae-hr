CREATE OR REPLACE FUNCTION public.get_public_chat_student_personal_info(p_session_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.students%ROWTYPE; v_pending boolean;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;
  SELECT * INTO s FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.student_update_requests WHERE student_id = p_student_id AND status = 'pending') INTO v_pending;
  RETURN jsonb_build_object(
    'first_name', s.first_name, 'last_name', s.last_name, 'date_of_birth', s.date_of_birth,
    'email', s.email, 'alt_emails', COALESCE(to_jsonb(s.alt_emails), '[]'::jsonb),
    'phone', s.phone, 'alt_phones', COALESCE(to_jsonb(s.alt_phones), '[]'::jsonb),
    'certificate_name', s.certificate_name,
    'last_name_first', CASE WHEN s.certificate_name IS NULL OR COALESCE(s.last_name, '') = '' THEN false ELSE upper(trim(s.certificate_name)) LIKE (upper(trim(s.last_name)) || '%') END,
    'has_pending_request', v_pending, 'has_passport_photo', NULLIF(s.passport_photo_url, '') IS NOT NULL
  );
END; $function$;
REVOKE ALL ON FUNCTION public.get_public_chat_student_personal_info(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_chat_student_personal_info(uuid, uuid) TO anon, authenticated;