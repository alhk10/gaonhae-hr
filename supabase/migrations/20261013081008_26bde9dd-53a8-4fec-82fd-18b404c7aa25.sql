REVOKE EXECUTE ON FUNCTION public.create_access_invoice(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_access_invoice(jsonb) TO anon, authenticated, service_role;