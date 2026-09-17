ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS alt_phones text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public._remember_student_phone(p_student_id uuid, p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_phone text;
BEGIN
  v_phone := btrim(coalesce(p_phone, ''));
  v_digits := regexp_replace(v_phone, '\D', '', 'g');
  IF length(v_digits) < 7 THEN
    RETURN;
  END IF;

  UPDATE public.students s
  SET alt_phones = array_append(coalesce(s.alt_phones, '{}'::text[]), v_phone),
      updated_at = now()
  WHERE s.id = p_student_id
    AND regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') <> v_digits
    AND NOT (v_digits = ANY (
      SELECT regexp_replace(p, '\D', '', 'g') FROM unnest(coalesce(s.alt_phones, '{}'::text[])) p
    ));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remember_student_contact(p_student_id uuid, p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch text;
BEGIN
  SELECT s.branch_id INTO v_branch FROM public.students s WHERE s.id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF NOT public.has_branch_access(v_branch) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  PERFORM public._remember_student_email(p_student_id, p_email);
  PERFORM public._remember_student_phone(p_student_id, p_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remember_student_contact(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.find_school_fees_submission_student_matches(p_id uuid)
RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record; sub_name text; sub_email text; sub_dob date;
  sub_email_shared boolean := false;
  sub_phone text; sub_phone_shared boolean := false;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;

  sub_name := upper(btrim(
    coalesce(sub.items->0->>'contact_first_name','') || ' ' || coalesce(sub.items->0->>'contact_last_name','')
  ));
  sub_email := lower(nullif(btrim(coalesce(sub.items->0->>'contact_email','')), ''));
  BEGIN
    sub_dob := nullif(btrim(coalesce(sub.items->0->>'contact_dob','')), '')::date;
  EXCEPTION WHEN others THEN
    sub_dob := NULL;
  END;

  SELECT nullif(regexp_replace(coalesce(cs.phone,''), '\D', '', 'g'), '')
    INTO sub_phone
  FROM public.public_chat_sessions cs WHERE cs.id = sub.session_id;
  IF sub_phone IS NOT NULL AND length(sub_phone) < 7 THEN sub_phone := NULL; END IF;

  IF sub_email IS NOT NULL THEN
    SELECT count(*) > 1 INTO sub_email_shared FROM public.students s
    WHERE lower(coalesce(s.email,'')) = sub_email
       OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e);
  END IF;

  IF sub_phone IS NOT NULL THEN
    SELECT count(*) > 1 INTO sub_phone_shared FROM public.students s
    WHERE regexp_replace(coalesce(s.phone,''), '\D', '', 'g') = sub_phone
       OR sub_phone = ANY (SELECT regexp_replace(p, '\D', '', 'g') FROM unnest(coalesce(s.alt_phones,'{}'::text[])) p);
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id, s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email, s.date_of_birth, s.branch_id, s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (sub_email IS NOT NULL AND (
        lower(coalesce(s.email,'')) = sub_email
        OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e)
      )) AS email_match,
      (sub_phone IS NOT NULL AND (
        regexp_replace(coalesce(s.phone,''), '\D', '', 'g') = sub_phone
        OR sub_phone = ANY (SELECT regexp_replace(p, '\D', '', 'g') FROM unnest(coalesce(s.alt_phones,'{}'::text[])) p)
      )) AS phone_match,
      (sub_dob IS NOT NULL AND s.date_of_birth = sub_dob) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match AND NOT sub_email_shared THEN 0.15 ELSE 0 END
      + CASE WHEN sc.phone_match AND NOT sub_phone_shared THEN 0.15 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.6)::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match AND sub_email_shared THEN 'shared family email'
           WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.phone_match AND sub_phone_shared THEN 'shared family mobile'
           WHEN sc.phone_match THEN 'mobile match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.phone_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC LIMIT 25;
END;
$$;