CREATE OR REPLACE FUNCTION public.get_public_grading_slots_by_date(p_date date)
RETURNS TABLE(id uuid, branch_id text, branch_name text, grading_date date, start_time time without time zone, end_time time without time zone, title text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT gs.id, gs.branch_id, b.name, gs.grading_date, gs.start_time, gs.end_time, gs.title
  FROM public.grading_slots gs
  JOIN public.branches b ON b.id = gs.branch_id
  WHERE gs.grading_date = p_date
    AND COALESCE(gs.status, 'active') <> 'cancelled'
  ORDER BY gs.start_time NULLS LAST, b.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_slots_by_date(date) TO anon, authenticated;