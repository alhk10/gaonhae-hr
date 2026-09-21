CREATE OR REPLACE FUNCTION public.get_public_chat_student_personal_info(p_session_id uuid, p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.students%ROWTYPE;
  v_pending boolean;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  SELECT * INTO s FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.student_update_requests
    WHERE student_id = p_student_id AND status = 'pending'
  ) INTO v_pending;

  RETURN jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'date_of_birth', s.date_of_birth,
    'email', s.email,
    'alt_emails', COALESCE(to_jsonb(s.alt_emails), '[]'::jsonb),
    'phone', s.phone,
    'alt_phones', COALESCE(to_jsonb(s.alt_phones), '[]'::jsonb),
    'certificate_name', s.certificate_name,
    'last_name_first', CASE
      WHEN s.certificate_name IS NULL OR COALESCE(s.last_name, '') = '' THEN false
      ELSE upper(trim(s.certificate_name)) LIKE (upper(trim(s.last_name)) || '%')
    END,
    'has_pending_request', v_pending
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chat_student_personal_info(
  p_session_id uuid,
  p_student_id uuid,
  p_first_name text,
  p_last_name text,
  p_date_of_birth date,
  p_last_name_first boolean,
  p_emails text[],
  p_phones text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.students%ROWTYPE;
  v_blocked text[] := ARRAY[
    'gaonhaetaekwondo@gmail.com',
    'management@gaonhaetaekwondo.com',
    'hello@gaonhaetaekwondo.com',
    'kem.gaonhaetaekwondo@gmail.com',
    'ysn.gaonhaetaekwondo@gmail.com',
    'bkm.gaonhaetaekwondo@gmail.com',
    'jw.gaonhaetaekwondo@gmail.com'
  ];
  v_emails text[] := ARRAY[]::text[];
  v_phones text[] := ARRAY[]::text[];
  v_item text;
  v_primary_email text;
  v_primary_phone text;
  v_alt_emails text[];
  v_alt_phones text[];
  v_cert_first text;
  v_cert_last text;
  v_cert text;
  v_pending jsonb := '{}'::jsonb;
  v_first text;
  v_last text;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  SELECT * INTO s FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Normalise emails
  IF p_emails IS NOT NULL THEN
    FOREACH v_item IN ARRAY p_emails LOOP
      v_item := lower(trim(COALESCE(v_item, '')));
      CONTINUE WHEN v_item = '';
      IF v_item = ANY (v_blocked) THEN
        RAISE EXCEPTION 'Please use your own email address, not a school address.';
      END IF;
      IF position('@' in v_item) < 2 THEN
        RAISE EXCEPTION 'Please enter a valid email address.';
      END IF;
      IF NOT (v_item = ANY (v_emails)) THEN
        v_emails := array_append(v_emails, v_item);
      END IF;
    END LOOP;
  END IF;

  -- Normalise phones
  IF p_phones IS NOT NULL THEN
    FOREACH v_item IN ARRAY p_phones LOOP
      v_item := trim(COALESCE(v_item, ''));
      CONTINUE WHEN v_item = '';
      IF NOT (v_item = ANY (v_phones)) THEN
        v_phones := array_append(v_phones, v_item);
      END IF;
    END LOOP;
  END IF;

  v_primary_email := NULLIF(v_emails[1], '');
  v_primary_phone := NULLIF(v_phones[1], '');
  v_alt_emails := COALESCE(v_emails[2:array_length(v_emails, 1)], ARRAY[]::text[]);
  v_alt_phones := COALESCE(v_phones[2:array_length(v_phones, 1)], ARRAY[]::text[]);

  -- Certificate name uses the current (approved) names
  v_cert_first := upper(trim(COALESCE(s.first_name, '')));
  v_cert_last := upper(trim(COALESCE(s.last_name, '')));
  IF COALESCE(p_last_name_first, false) AND v_cert_last <> '' THEN
    v_cert := trim(v_cert_last || ' ' || v_cert_first);
  ELSE
    v_cert := trim(v_cert_first || ' ' || v_cert_last);
  END IF;

  UPDATE public.students
  SET email = v_primary_email,
      alt_emails = v_alt_emails,
      phone = v_primary_phone,
      alt_phones = v_alt_phones,
      certificate_name = NULLIF(v_cert, ''),
      updated_at = now(),
      updated_by = 'hello_chat'
  WHERE id = p_student_id;

  INSERT INTO public.student_change_logs (student_id, action, changes, changed_by, changed_by_email)
  VALUES (
    p_student_id,
    'update',
    jsonb_build_object(
      'email', jsonb_build_object('old', s.email, 'new', v_primary_email),
      'alt_emails', jsonb_build_object('old', to_jsonb(s.alt_emails), 'new', to_jsonb(v_alt_emails)),
      'phone', jsonb_build_object('old', s.phone, 'new', v_primary_phone),
      'alt_phones', jsonb_build_object('old', to_jsonb(s.alt_phones), 'new', to_jsonb(v_alt_phones)),
      'certificate_name', jsonb_build_object('old', s.certificate_name, 'new', NULLIF(v_cert, ''))
    ),
    'hello_chat',
    v_primary_email
  );

  -- Name / DOB changes go to approval
  v_first := NULLIF(upper(trim(COALESCE(p_first_name, ''))), '');
  v_last := NULLIF(upper(trim(COALESCE(p_last_name, ''))), '');

  IF v_first IS NOT NULL AND v_first <> upper(trim(COALESCE(s.first_name, ''))) THEN
    v_pending := v_pending || jsonb_build_object('first_name', v_first);
  END IF;
  IF p_last_name IS NOT NULL AND COALESCE(v_last, '') <> upper(trim(COALESCE(s.last_name, ''))) THEN
    v_pending := v_pending || jsonb_build_object('last_name', v_last);
  END IF;
  IF p_date_of_birth IS NOT NULL AND p_date_of_birth IS DISTINCT FROM s.date_of_birth THEN
    v_pending := v_pending || jsonb_build_object('date_of_birth', to_char(p_date_of_birth, 'YYYY-MM-DD'));
  END IF;

  IF v_pending <> '{}'::jsonb THEN
    INSERT INTO public.student_update_requests (student_id, requested_changes, status)
    VALUES (p_student_id, v_pending, 'pending');
  END IF;

  RETURN jsonb_build_object(
    'saved', true,
    'pending_fields', v_pending
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_chat_student_personal_info(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.update_chat_student_personal_info(uuid, uuid, text, text, date, boolean, text[], text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_chat_student_personal_info(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_chat_student_personal_info(uuid, uuid, text, text, date, boolean, text[], text[]) TO anon, authenticated;