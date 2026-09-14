CREATE OR REPLACE FUNCTION public.admin_search_students_for_grading(p_query text)
RETURNS TABLE(id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.id,
         s.student_number,
         upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
         s.email,
         s.date_of_birth,
         s.branch_id,
         s.current_belt
  FROM public.students s
  WHERE length(btrim(coalesce(p_query,''))) >= 2
    AND (
      s.first_name ILIKE '%' || btrim(p_query) || '%'
      OR s.last_name ILIKE '%' || btrim(p_query) || '%'
      OR coalesce(s.email,'') ILIKE '%' || btrim(p_query) || '%'
      OR s.student_number ILIKE '%' || btrim(p_query) || '%'
      OR upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) ILIKE '%' || upper(btrim(p_query)) || '%'
    )
  ORDER BY s.first_name, s.last_name
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_student_for_grading(
  p_first_name text,
  p_last_name text,
  p_branch_id text,
  p_date_of_birth date DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_current_belt text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first text := upper(btrim(coalesce(p_first_name,'')));
  v_last text := upper(btrim(coalesce(p_last_name,'')));
  v_id uuid;
BEGIN
  IF v_first = '' THEN
    RAISE EXCEPTION 'First name is required';
  END IF;
  IF p_branch_id IS NULL OR btrim(p_branch_id) = '' THEN
    RAISE EXCEPTION 'Branch is required';
  END IF;

  -- Reuse an existing account instead of creating a duplicate person.
  SELECT s.id INTO v_id
  FROM public.students s
  WHERE upper(coalesce(s.first_name,'')) = v_first
    AND upper(coalesce(s.last_name,'')) = v_last
    AND (p_date_of_birth IS NULL OR s.date_of_birth = p_date_of_birth)
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.students (
    student_number, first_name, last_name, display_name, certificate_name,
    date_of_birth, email, branch_id, current_belt, status
  ) VALUES (
    public.generate_student_number(), v_first, v_last,
    btrim(v_first || ' ' || v_last), btrim(v_first || ' ' || v_last),
    p_date_of_birth, nullif(btrim(coalesce(p_email,'')), ''), p_branch_id,
    nullif(btrim(coalesce(p_current_belt,'')), ''), 'active'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;