CREATE OR REPLACE FUNCTION public.get_public_sibling_discount(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT email, branch_id
    FROM public.students
    WHERE id = p_student_id
  )
  SELECT CASE
    WHEN (SELECT email FROM me) IS NULL THEN 0
    WHEN (
      SELECT count(*) FROM public.students s, me
      WHERE lower(s.email) = lower(me.email)
        AND s.status = 'active'
    ) >= 2
      THEN CASE WHEN lower(coalesce((SELECT branch_id FROM me), '')) LIKE '%yishun%' THEN 10 ELSE 20 END
    ELSE 0
  END::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_sibling_discount(uuid) TO anon, authenticated, service_role;