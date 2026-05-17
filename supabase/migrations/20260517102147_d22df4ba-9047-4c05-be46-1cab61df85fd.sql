
CREATE OR REPLACE FUNCTION public.get_public_grading_slots(
  p_branch_id text,
  p_product_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  branch_id text,
  branch_name text,
  branch_address text,
  grading_date date,
  start_time time,
  end_time time,
  location text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.id,
    gs.branch_id,
    b.name AS branch_name,
    b.address AS branch_address,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location
  FROM public.grading_slots gs
  JOIN public.branches b ON b.id = gs.branch_id
  WHERE gs.grading_date >= CURRENT_DATE
    AND COALESCE(gs.status, 'active') <> 'cancelled'
    AND (
      gs.branch_id = p_branch_id
      OR (gs.available_branch_ids IS NOT NULL AND p_branch_id = ANY(gs.available_branch_ids))
    )
    AND (
      p_product_ids IS NULL
      OR array_length(p_product_ids, 1) IS NULL
      OR (gs.grading_product_ids IS NOT NULL AND gs.grading_product_ids && p_product_ids)
    )
  ORDER BY gs.grading_date ASC, gs.start_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_slots(text, uuid[]) TO anon, authenticated;
