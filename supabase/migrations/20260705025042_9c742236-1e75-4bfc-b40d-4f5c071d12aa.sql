
-- Helper: current user email
CREATE OR REPLACE FUNCTION public.sms_current_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email')::text;
$$;

-- Superadmin check based on email
CREATE OR REPLACE FUNCTION public.sms_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_users
    WHERE employee_email = (auth.jwt() ->> 'email')::text
      AND is_active = true
  );
$$;

-- Admin or superadmin check
CREATE OR REPLACE FUNCTION public.sms_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_users
    WHERE employee_email = (auth.jwt() ->> 'email')::text AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.admin_access
    WHERE employee_id = (auth.jwt() ->> 'email')::text
  );
$$;

CREATE OR REPLACE FUNCTION public.sms_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. sms_devices
CREATE TABLE public.sms_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  send_delay_ms INTEGER NOT NULL DEFAULT 3000,
  poll_interval_seconds INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_devices TO authenticated;
GRANT ALL ON public.sms_devices TO service_role;
ALTER TABLE public.sms_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin manages devices" ON public.sms_devices FOR ALL TO authenticated
  USING (public.sms_is_superadmin()) WITH CHECK (public.sms_is_superadmin());
CREATE POLICY "Admins view devices" ON public.sms_devices FOR SELECT TO authenticated
  USING (public.sms_is_admin());
CREATE TRIGGER sms_devices_updated_at BEFORE UPDATE ON public.sms_devices
  FOR EACH ROW EXECUTE FUNCTION public.sms_touch_updated_at();

-- 2. sms_campaigns
CREATE TABLE public.sms_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sending','completed','cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_campaigns TO authenticated;
GRANT ALL ON public.sms_campaigns TO service_role;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.sms_campaigns FOR ALL TO authenticated
  USING (public.sms_is_admin()) WITH CHECK (public.sms_is_admin());
CREATE TRIGGER sms_campaigns_updated_at BEFORE UPDATE ON public.sms_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.sms_touch_updated_at();

-- 3. sms_outbound
CREATE TABLE public.sms_outbound (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sending','sent','failed','delivered','cancelled')),
  send_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  device_id UUID REFERENCES public.sms_devices(id) ON DELETE SET NULL,
  device_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sms_outbound_queued_idx ON public.sms_outbound (status, send_at)
  WHERE status IN ('queued','sending');
CREATE INDEX sms_outbound_campaign_idx ON public.sms_outbound (campaign_id);
CREATE INDEX sms_outbound_phone_idx ON public.sms_outbound (phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_outbound TO authenticated;
GRANT ALL ON public.sms_outbound TO service_role;
ALTER TABLE public.sms_outbound ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage outbound" ON public.sms_outbound FOR ALL TO authenticated
  USING (public.sms_is_admin()) WITH CHECK (public.sms_is_admin());
CREATE TRIGGER sms_outbound_updated_at BEFORE UPDATE ON public.sms_outbound
  FOR EACH ROW EXECUTE FUNCTION public.sms_touch_updated_at();

-- 4. sms_threads
CREATE TABLE public.sms_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_direction TEXT CHECK (last_direction IN ('in','out')),
  last_snippet TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sms_threads_last_message_idx ON public.sms_threads (last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_threads TO authenticated;
GRANT ALL ON public.sms_threads TO service_role;
ALTER TABLE public.sms_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage threads" ON public.sms_threads FOR ALL TO authenticated
  USING (public.sms_is_admin()) WITH CHECK (public.sms_is_admin());
CREATE TRIGGER sms_threads_updated_at BEFORE UPDATE ON public.sms_threads
  FOR EACH ROW EXECUTE FUNCTION public.sms_touch_updated_at();

-- 5. sms_messages
CREATE TABLE public.sms_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.sms_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  outbound_id UUID REFERENCES public.sms_outbound(id) ON DELETE SET NULL,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sms_messages_thread_idx ON public.sms_messages (thread_id, sent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage messages" ON public.sms_messages FOR ALL TO authenticated
  USING (public.sms_is_admin()) WITH CHECK (public.sms_is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_outbound;
