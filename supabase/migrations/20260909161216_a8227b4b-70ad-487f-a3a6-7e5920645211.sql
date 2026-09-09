
CREATE OR REPLACE FUNCTION public.create_public_chat_session(
  p_first_name text,
  p_last_name text,
  p_date_of_birth date,
  p_branch_id text,
  p_gender text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.public_chat_sessions (first_name, last_name, date_of_birth, branch_id, gender, email, phone)
  VALUES (
    upper(trim(coalesce(p_first_name,''))),
    upper(trim(coalesce(p_last_name,''))),
    p_date_of_birth,
    p_branch_id,
    nullif(lower(trim(coalesce(p_gender,''))), ''),
    nullif(lower(trim(coalesce(p_email,''))), ''),
    nullif(trim(coalesce(p_phone,'')), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_chat_session(text, text, date, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_chat_callback(
  p_session_id uuid,
  p_branch_id text,
  p_name text,
  p_type text,
  p_message text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_preferred_time text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_matched_student_id uuid DEFAULT NULL,
  p_outcome text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_session_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.public_chat_sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  INSERT INTO public.public_chat_callback_requests (
    session_id, branch_id, name, type, message, contact_phone, contact_email,
    preferred_time, first_name, last_name, date_of_birth, gender, matched_student_id
  ) VALUES (
    p_session_id, p_branch_id, p_name, coalesce(p_type, 'general_callback'), p_message,
    nullif(trim(coalesce(p_contact_phone,'')), ''),
    nullif(lower(trim(coalesce(p_contact_email,''))), ''),
    p_preferred_time,
    nullif(upper(trim(coalesce(p_first_name,''))), ''),
    nullif(upper(trim(coalesce(p_last_name,''))), ''),
    p_date_of_birth,
    nullif(lower(trim(coalesce(p_gender,''))), ''),
    p_matched_student_id
  ) RETURNING id INTO v_id;

  UPDATE public.public_chat_sessions
     SET outcome = coalesce(p_outcome, outcome),
         updated_at = now()
   WHERE id = p_session_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_chat_callback(uuid, text, text, text, text, text, text, text, text, text, date, text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_public_chat_callback_email_sent(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.public_chat_callback_requests
     SET email_sent_at = now()
   WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_public_chat_callback_email_sent(uuid) TO anon, authenticated;
