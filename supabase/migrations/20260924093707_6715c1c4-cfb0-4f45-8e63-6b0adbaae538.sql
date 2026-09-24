CREATE OR REPLACE FUNCTION public.admin_import_seminar_submission_student(p_id uuid, p_created_by text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub record; v_student_id uuid;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  -- Already matched: never create another student.
  IF sub.matched_student_id IS NOT NULL THEN RETURN sub.matched_student_id; END IF;

  -- Reuse an existing student with the same name + birth date.
  SELECT id INTO v_student_id FROM public.students
  WHERE upper(btrim(first_name)) = upper(btrim(sub.first_name))
    AND upper(btrim(coalesce(last_name,''))) = upper(btrim(coalesce(sub.last_name,'')))
    AND date_of_birth IS NOT DISTINCT FROM sub.date_of_birth
  ORDER BY (branch_id = sub.branch_id) DESC, created_at ASC LIMIT 1;

  IF v_student_id IS NULL THEN
    INSERT INTO public.students (first_name, last_name, email, branch_id, date_of_birth,
      gender, current_belt, status, created_by, updated_by)
    VALUES (upper(sub.first_name), upper(sub.last_name), NULLIF(lower(sub.email),''),
      sub.branch_id, sub.date_of_birth, sub.gender, sub.current_belt, 'trial', p_created_by, p_created_by)
    RETURNING id INTO v_student_id;
  END IF;

  UPDATE public.seminar_payment_submissions SET matched_student_id = v_student_id, updated_at = now() WHERE id = p_id;
  RETURN v_student_id;
END;
$$;