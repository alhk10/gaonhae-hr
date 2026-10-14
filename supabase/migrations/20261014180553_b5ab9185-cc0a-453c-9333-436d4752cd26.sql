CREATE OR REPLACE FUNCTION public.delete_perth_event_registration(p_password text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF encode(extensions.digest('perth:' || coalesce(p_password,''), 'sha256'), 'hex') <> 'a2bb9799b8f6e10ef9b3a7cf0cf647dbcc894941415e27b19c36f34b5f33d42d' THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;
  DELETE FROM public.perth_event_registrations WHERE id = p_id;
  RETURN found;
END $$;

REVOKE ALL ON FUNCTION public.delete_perth_event_registration(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_perth_event_registration(text, uuid) TO anon, authenticated, service_role;