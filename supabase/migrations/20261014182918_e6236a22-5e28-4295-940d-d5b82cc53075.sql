CREATE OR REPLACE FUNCTION public.get_perth_competition_entries()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'name', first_name || ' ' || last_name,
    'club', club,
    'age_division', age_division,
    'grade', grade,
    'events', comp_events
  ) ORDER BY age_division, _perth_grade_rank(grade) DESC, last_name, first_name), '[]'::jsonb)
  FROM perth_event_registrations
  WHERE status NOT IN ('rejected','cancelled','refunded')
    AND cardinality(comp_events) > 0
$$;

REVOKE ALL ON FUNCTION public.get_perth_competition_entries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_perth_competition_entries() TO anon, authenticated, service_role;