CREATE OR REPLACE FUNCTION public.find_grading_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record; sub_name text; sub_email text; sub_email_shared boolean := false;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));
  sub_email := nullif(lower(btrim(coalesce(sub.email,''))), '');

  IF sub_email IS NOT NULL THEN
    SELECT count(*) > 1 INTO sub_email_shared FROM public.students s
    WHERE lower(coalesce(s.email,'')) = sub_email
       OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e);
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
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match AND NOT sub_email_shared THEN 0.15 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.6)::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match AND sub_email_shared THEN 'shared family email'
           WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_competition_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record; sub_name text; sub_email text; sub_email_shared boolean := false;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));
  sub_email := nullif(lower(btrim(coalesce(sub.email,''))), '');

  IF sub_email IS NOT NULL THEN
    SELECT count(*) > 1 INTO sub_email_shared FROM public.students s
    WHERE lower(coalesce(s.email,'')) = sub_email
       OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e);
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
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match AND NOT sub_email_shared THEN 0.15 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.6)::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match AND sub_email_shared THEN 'shared family email'
           WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_seminar_submission_student_matches(p_id uuid)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record; sub_name text; sub_email text; sub_email_shared boolean := false;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));
  sub_email := nullif(lower(btrim(coalesce(sub.email,''))), '');

  IF sub_email IS NOT NULL THEN
    SELECT count(*) > 1 INTO sub_email_shared FROM public.students s
    WHERE lower(coalesce(s.email,'')) = sub_email
       OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e);
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
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match AND NOT sub_email_shared THEN 0.15 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.6)::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match AND sub_email_shared THEN 'shared family email'
           WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
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
  sub record; sub_name text; sub_email text; sub_dob date; sub_email_shared boolean := false;
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

  IF sub_email IS NOT NULL THEN
    SELECT count(*) > 1 INTO sub_email_shared FROM public.students s
    WHERE lower(coalesce(s.email,'')) = sub_email
       OR sub_email = ANY (SELECT lower(e) FROM unnest(coalesce(s.alt_emails,'{}'::text[])) e);
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
      (sub_dob IS NOT NULL AND s.date_of_birth = sub_dob) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match AND NOT sub_email_shared THEN 0.15 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.6)::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match AND sub_email_shared THEN 'shared family email'
           WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC LIMIT 25;
END;
$function$;