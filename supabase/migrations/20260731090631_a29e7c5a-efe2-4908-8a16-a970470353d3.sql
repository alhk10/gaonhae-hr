CREATE OR REPLACE FUNCTION public.login_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(u.email) = lower(trim(coalesce(p_email, '')))
      AND u.deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.login_email_exists(text) FROM public;
GRANT EXECUTE ON FUNCTION public.login_email_exists(text) TO anon, authenticated, service_role;