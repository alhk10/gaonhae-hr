REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;