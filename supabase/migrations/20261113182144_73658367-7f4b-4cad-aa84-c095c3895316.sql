INSERT INTO public.branches (id, name, address, color, country, currency) VALUES
 ('greenwood','Greenwood','Greenwood WA','bg-blue-500','Australia','AUD'),
 ('floreat','Floreat','Floreat WA','bg-blue-500','Australia','AUD'),
 ('yokine','Yokine','Yokine WA','bg-blue-500','Australia','AUD')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.trial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id text NOT NULL REFERENCES public.branches(id),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  participant_name text NOT NULL,
  participant_dob date,
  remarks text,
  source text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','booked','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trial_requests_branch_idx ON public.trial_requests(branch_id, created_at DESC);
GRANT SELECT, UPDATE ON public.trial_requests TO authenticated;
GRANT ALL ON public.trial_requests TO service_role;
ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read trial requests" ON public.trial_requests FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.jwt()->>'email'));
CREATE POLICY "Superadmins update trial requests" ON public.trial_requests FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.jwt()->>'email')) WITH CHECK (public.is_superadmin(auth.jwt()->>'email'));

CREATE OR REPLACE FUNCTION public.access_trial_requests(p_password text)
RETURNS TABLE(id uuid, branch_id text, branch_name text, contact_name text, contact_email text, contact_phone text,
  participant_name text, participant_dob date, remarks text, source text, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := public._access_scope_read(p_password);
BEGIN
  IF v_scope IS NULL THEN RAISE EXCEPTION 'Invalid password'; END IF;
  RETURN QUERY SELECT t.id, t.branch_id, b.name, t.contact_name, t.contact_email, t.contact_phone,
    t.participant_name, t.participant_dob, t.remarks, t.source, t.status, t.created_at
  FROM trial_requests t JOIN branches b ON b.id = t.branch_id
  WHERE public._scope_has(v_scope, t.branch_id)
  ORDER BY t.created_at DESC LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.access_trial_request_set_status(p_password text, p_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := public._access_scope(p_password); v_branch text;
BEGIN
  IF v_scope IS NULL THEN RAISE EXCEPTION 'Invalid password'; END IF;
  IF p_status NOT IN ('new','contacted','booked','closed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT branch_id INTO v_branch FROM trial_requests WHERE id = p_id;
  IF v_branch IS NULL OR NOT public._scope_has(v_scope, v_branch) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE trial_requests SET status = p_status WHERE id = p_id;
END $$;
GRANT EXECUTE ON FUNCTION public.access_trial_requests(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_trial_request_set_status(text, uuid, text) TO anon, authenticated;