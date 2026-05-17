CREATE OR REPLACE FUNCTION public.get_public_grading_slots(p_branch_id text, p_product_ids uuid[], p_dob date DEFAULT NULL::date, p_current_belt text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, branch_id text, branch_name text, branch_address text, grading_date date, start_time time without time zone, end_time time without time zone, location text, title text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    gs.id,
    gs.branch_id,
    b.name AS branch_name,
    b.address AS branch_address,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    gs.title
  FROM public.grading_slots gs
  JOIN public.branches b ON b.id = gs.branch_id
  WHERE gs.grading_date >= CURRENT_DATE
    AND COALESCE(gs.status, 'active') <> 'cancelled'
    AND (
      gs.branch_id = p_branch_id
      OR (gs.available_branch_ids IS NOT NULL AND p_branch_id = ANY(gs.available_branch_ids))
    )
    AND (
      p_dob IS NULL
      OR (
        (gs.min_age IS NULL OR date_part('year', age(gs.grading_date, p_dob)) >= gs.min_age)
        AND
        (gs.max_age IS NULL OR date_part('year', age(gs.grading_date, p_dob)) <= gs.max_age)
      )
    )
    AND (
      -- belt match always wins (allows Stage slots through regardless of product filter)
      (p_current_belt IS NOT NULL
        AND gs.belt_levels IS NOT NULL
        AND array_length(gs.belt_levels, 1) IS NOT NULL
        AND p_current_belt = ANY(gs.belt_levels))
      OR (
        -- fall back to product + belt rule
        (
          p_product_ids IS NULL
          OR array_length(p_product_ids, 1) IS NULL
          OR gs.grading_product_ids IS NULL
          OR array_length(gs.grading_product_ids, 1) IS NULL
          OR gs.grading_product_ids && p_product_ids
        )
        AND (
          p_current_belt IS NULL
          OR gs.belt_levels IS NULL
          OR array_length(gs.belt_levels, 1) IS NULL
          OR p_current_belt = ANY(gs.belt_levels)
        )
      )
    )
  ORDER BY gs.grading_date ASC, gs.start_time ASC;
$function$;