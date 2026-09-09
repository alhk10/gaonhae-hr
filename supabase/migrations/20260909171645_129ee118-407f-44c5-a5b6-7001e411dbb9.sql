CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL OR _user_id <> auth.uid() THEN false
    WHEN _role = 'superadmin' THEN EXISTS (
      SELECT 1 FROM public.superadmin_users
      WHERE employee_email = auth.email() AND is_active = true
    )
    WHEN _role = 'admin' THEN public.get_current_user_role() IN ('admin','superadmin')
    WHEN _role = 'employee' THEN public.get_current_user_role() IN ('employee','admin','superadmin')
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;