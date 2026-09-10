ALTER TABLE public.students ADD COLUMN IF NOT EXISTS alt_emails text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public._remember_student_email(p_student_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN;
  END IF;

  UPDATE public.students s
  SET alt_emails = array_append(coalesce(s.alt_emails, '{}'::text[]), v_email),
      updated_at = now()
  WHERE s.id = p_student_id
    AND lower(coalesce(s.email, '')) <> v_email
    AND NOT (v_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails, '{}'::text[])) e));
END;
$function$;

-- Match RPCs remember the submission email
CREATE OR REPLACE FUNCTION public.admin_match_grading_submission(p_id uuid, p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.grading_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;

  PERFORM public._remember_student_email(p_student_id, sub.email);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_match_competition_submission(p_id uuid, p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.competition_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;

  PERFORM public._remember_student_email(p_student_id, sub.email);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_match_seminar_submission(p_id uuid, p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.seminar_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;

  PERFORM public._remember_student_email(p_student_id, sub.email);
END;
$function$;

-- Scorers accept any known email
CREATE OR REPLACE FUNCTION public.find_grading_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  sub_name text;
  sub_email text;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));
  sub_email := nullif(lower(btrim(coalesce(sub.email,''))), '');

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id,
      s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email,
      s.date_of_birth,
      s.branch_id,
      s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (sub_email IS NOT NULL AND (
        lower(coalesce(s.email,'')) = sub_email
        OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e)
      )) AS email_match,
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (
      CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5
    )::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name '||round(sc.name_sim*100)::text||'%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC
  LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_competition_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  sub_name text;
  sub_email text;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));
  sub_email := nullif(lower(btrim(coalesce(sub.email,''))), '');

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id,
      s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email,
      s.date_of_birth,
      s.branch_id,
      s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (sub_email IS NOT NULL AND (
        lower(coalesce(s.email,'')) = sub_email
        OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e)
      )) AS email_match,
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (
      CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5
    )::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC
  LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_seminar_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record; sub_name text; sub_email text;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));
  sub_email := nullif(lower(btrim(coalesce(sub.email,''))), '');

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
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5)::numeric,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    )
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_school_fees_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  sub_name text;
  sub_email text;
  sub_dob date;
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

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id,
      s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email,
      s.date_of_birth,
      s.branch_id,
      s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (sub_email IS NOT NULL AND (
        lower(coalesce(s.email,'')) = sub_email
        OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e)
      )) AS email_match,
      (sub_dob IS NOT NULL AND s.date_of_birth = sub_dob) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (
      CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5
    )::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name '||round(sc.name_sim*100)::text||'%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC
  LIMIT 25;
END;
$function$;

GRANT EXECUTE ON FUNCTION public._remember_student_email(uuid, text) TO authenticated, anon, service_role;