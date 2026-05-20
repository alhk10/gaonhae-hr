
-- Drop accessory submissions infrastructure
DROP TABLE IF EXISTS public.accessory_payment_submissions CASCADE;
DROP FUNCTION IF EXISTS public.generate_accessory_payment_reference() CASCADE;

-- ============ /hello chat infrastructure ============

CREATE TABLE public.public_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  date_of_birth date,
  branch_id text,
  gender text,
  email text,
  phone text,
  matched_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.public_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert chat sessions" ON public.public_chat_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon update own session" ON public.public_chat_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth select chat sessions" ON public.public_chat_sessions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.public_chat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.public_chat_sessions(id) ON DELETE CASCADE,
  step text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pce_session ON public.public_chat_events(session_id);
ALTER TABLE public.public_chat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert chat events" ON public.public_chat_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "auth select chat events" ON public.public_chat_events FOR SELECT TO authenticated USING (true);

CREATE TABLE public.public_chat_callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.public_chat_sessions(id) ON DELETE SET NULL,
  branch_id text,
  name text,
  contact_phone text,
  contact_email text,
  type text NOT NULL DEFAULT 'general_callback',
  message text,
  preferred_time text,
  status text NOT NULL DEFAULT 'new',
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pccr_status ON public.public_chat_callback_requests(status);
ALTER TABLE public.public_chat_callback_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert callbacks" ON public.public_chat_callback_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "auth select callbacks" ON public.public_chat_callback_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update callbacks" ON public.public_chat_callback_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.public_chat_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.public_chat_sessions(id) ON DELETE SET NULL,
  reference_number text UNIQUE,
  branch_id text,
  category text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount numeric(10,2),
  payment_method text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending_verification',
  matched_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  matched_invoice_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcps_status ON public.public_chat_payment_submissions(status);
ALTER TABLE public.public_chat_payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert chat payments" ON public.public_chat_payment_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "auth select chat payments" ON public.public_chat_payment_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update chat payments" ON public.public_chat_payment_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.generate_chat_payment_reference()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  r := 'HEL-' || to_char(now(),'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));
  RETURN r;
END;$$;

-- Auto reference number trigger
CREATE OR REPLACE FUNCTION public.set_chat_payment_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := public.generate_chat_payment_reference();
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_set_chat_payment_ref BEFORE INSERT ON public.public_chat_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_chat_payment_reference();

-- Match student by identity (case-insensitive name + DOB + branch)
CREATE OR REPLACE FUNCTION public.match_student_by_identity(
  p_first_name text, p_last_name text, p_dob date, p_branch_id text
) RETURNS TABLE(id uuid, first_name text, last_name text, current_belt text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.first_name, s.last_name, s.current_belt, s.status
  FROM public.students s
  WHERE upper(trim(s.first_name)) = upper(trim(p_first_name))
    AND upper(trim(s.last_name)) = upper(trim(p_last_name))
    AND s.date_of_birth = p_dob
    AND s.branch_id = p_branch_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.match_student_by_identity(text,text,date,text) TO anon, authenticated;
