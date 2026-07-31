CREATE OR REPLACE FUNCTION public.email_portal_record(p_email text)
RETURNS TABLE(kind text, record_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'student'::text, s.id, trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))
  FROM public.students s
  WHERE lower(s.email) = lower(trim(coalesce(p_email,'')))
    AND s.status IN ('active','trial')
  ORDER BY s.created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.email_portal_record(text) FROM public;
GRANT EXECUTE ON FUNCTION public.email_portal_record(text) TO anon, authenticated, service_role;