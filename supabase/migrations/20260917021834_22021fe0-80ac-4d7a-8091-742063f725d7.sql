CREATE OR REPLACE FUNCTION public.admin_remember_school_fees_contact(p_submission_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_phone text;
  v_branch text;
BEGIN
  SELECT s.branch_id INTO v_branch FROM public.students s WHERE s.id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF NOT public.has_branch_access(v_branch) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT coalesce(nullif(btrim(cs.email), ''), nullif(btrim(sub.items->0->>'contact_email'), '')),
         nullif(btrim(coalesce(cs.phone, '')), '')
    INTO v_email, v_phone
  FROM public.public_chat_payment_submissions sub
  LEFT JOIN public.public_chat_sessions cs ON cs.id = sub.session_id
  WHERE sub.id = p_submission_id;

  PERFORM public._remember_student_email(p_student_id, v_email);
  PERFORM public._remember_student_phone(p_student_id, v_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remember_school_fees_contact(uuid, uuid) TO authenticated;