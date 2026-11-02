CREATE OR REPLACE FUNCTION public.get_perth_competition_entries()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'name', first_name || ' ' || last_name, 'club', club, 'age_division', age_division,
    'grade', grade, 'gender', gender, 'grade_rank', _perth_grade_rank(grade), 'events', comp_events
  ) ORDER BY age_division, _perth_grade_rank(grade) DESC, last_name, first_name), '[]'::jsonb)
  FROM perth_event_registrations
  WHERE status NOT IN ('rejected','cancelled','refunded') AND cardinality(comp_events) > 0
$function$;