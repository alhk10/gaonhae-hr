CREATE OR REPLACE FUNCTION public.admin_match_grading_submission(p_id uuid, p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  v_student_dob date;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.grading_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;

  PERFORM public._remember_student_email(p_student_id, sub.email);

  -- Auto-correct 1-day legacy DOB drift on match
  SELECT date_of_birth INTO v_student_dob FROM public.students WHERE id = p_student_id;
  IF sub.date_of_birth IS NOT NULL AND v_student_dob IS NOT NULL
     AND abs(sub.date_of_birth - v_student_dob) = 1 THEN
    UPDATE public.students SET date_of_birth = sub.date_of_birth, updated_at = now()
    WHERE id = p_student_id;
    INSERT INTO public.student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'date_of_birth', v_student_dob::text, sub.date_of_birth::text, 'auto_match_dob_correction');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_match_competition_submission(p_id uuid, p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  v_student_dob date;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.competition_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;

  PERFORM public._remember_student_email(p_student_id, sub.email);

  -- Auto-correct 1-day legacy DOB drift on match
  SELECT date_of_birth INTO v_student_dob FROM public.students WHERE id = p_student_id;
  IF sub.date_of_birth IS NOT NULL AND v_student_dob IS NOT NULL
     AND abs(sub.date_of_birth - v_student_dob) = 1 THEN
    UPDATE public.students SET date_of_birth = sub.date_of_birth, updated_at = now()
    WHERE id = p_student_id;
    INSERT INTO public.student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'date_of_birth', v_student_dob::text, sub.date_of_birth::text, 'auto_match_dob_correction');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_match_seminar_submission(p_id uuid, p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  v_student_dob date;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.seminar_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;

  PERFORM public._remember_student_email(p_student_id, sub.email);

  -- Auto-correct 1-day legacy DOB drift on match
  SELECT date_of_birth INTO v_student_dob FROM public.students WHERE id = p_student_id;
  IF sub.date_of_birth IS NOT NULL AND v_student_dob IS NOT NULL
     AND abs(sub.date_of_birth - v_student_dob) = 1 THEN
    UPDATE public.students SET date_of_birth = sub.date_of_birth, updated_at = now()
    WHERE id = p_student_id;
    INSERT INTO public.student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'date_of_birth', v_student_dob::text, sub.date_of_birth::text, 'auto_match_dob_correction');
  END IF;
END;
$function$;