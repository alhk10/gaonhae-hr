CREATE OR REPLACE FUNCTION public.get_perth_event_clubs()
RETURNS TABLE(club text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.club
  FROM public.perth_event_registrations r
  WHERE r.club IS NOT NULL AND btrim(r.club) <> ''
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_perth_event_clubs() TO anon, authenticated, service_role;