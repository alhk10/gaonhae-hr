CREATE OR REPLACE FUNCTION public.set_public_chat_session_match(
  p_session_id uuid,
  p_matched_student_id uuid,
  p_outcome text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_branch text;
BEGIN
  SELECT branch_id INTO v_branch FROM public.public_chat_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown chat session';
  END IF;

  IF p_matched_student_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_matched_student_id
        AND (v_branch IS NULL OR s.branch_id = v_branch)
    ) THEN
      RAISE EXCEPTION 'Student does not belong to this chat branch';
    END IF;
  END IF;

  UPDATE public.public_chat_sessions
  SET matched_student_id = p_matched_student_id,
      outcome = COALESCE(p_outcome, outcome),
      updated_at = now()
  WHERE id = p_session_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_public_chat_session_match(uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_public_chat_session_match(uuid, uuid, text) TO anon, authenticated, service_role;