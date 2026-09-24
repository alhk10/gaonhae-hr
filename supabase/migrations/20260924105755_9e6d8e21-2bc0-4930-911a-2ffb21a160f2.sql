CREATE TABLE IF NOT EXISTS public.superadmin_alert_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sent_at timestamptz,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.superadmin_alert_state TO service_role;
ALTER TABLE public.superadmin_alert_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.superadmin_alert_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.superadmin_pending_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a int := 0; v int := 0; n int; t text;
BEGIN
  SELECT count(*) INTO v FROM payments WHERE verification_status = 'pending';
  SELECT v + count(*) INTO v FROM grading_payment_submissions WHERE status = 'pending_verification';
  SELECT v + count(*) INTO v FROM competition_payment_submissions WHERE status = 'pending_verification';
  SELECT v + count(*) INTO v FROM seminar_payment_submissions WHERE status = 'pending_verification';
  SELECT v + count(*) INTO v FROM public_chat_payment_submissions WHERE status = 'pending_verification';
  SELECT v + count(*) INTO v FROM guards_purchases WHERE sale_status = 'pending_verification';
  FOREACH t IN ARRAY ARRAY['student_registrations','student_update_requests','invoice_action_requests','invoice_deletion_requests','invoice_discount_approvals','payment_deletion_requests','submission_deletion_requests','submission_edit_requests','student_withdrawal_requests','student_merge_requests','leave_requests','claims','grading_deletion_requests','slot_booking_edit_requests'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE status = %L', t, 'pending') INTO n;
    a := a + n;
  END LOOP;
  RETURN jsonb_build_object('approvals', a, 'verifications', v);
END $$;
REVOKE ALL ON FUNCTION public.superadmin_pending_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.superadmin_pending_counts() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_notify_superadmin_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE st text; tok text; kind text := TG_ARGV[0]; col text := TG_ARGV[1]; want text := TG_ARGV[2];
BEGIN
  BEGIN
    st := to_jsonb(NEW) ->> col;
    IF st IS DISTINCT FROM want THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) ->> col) = want THEN RETURN NEW; END IF;
    UPDATE superadmin_alert_state SET last_sent_at = now(), updated_at = now()
      WHERE id = 1 AND (last_sent_at IS NULL OR last_sent_at < now() - interval '60 seconds')
      RETURNING token INTO tok;
    IF tok IS NULL THEN RETURN NEW; END IF;
    PERFORM net.http_post(
      url := 'https://qwdcbfnuywgubumlgscy.supabase.co/functions/v1/notify-superadmin-approvals',
      headers := jsonb_build_object('Content-Type','application/json','x-alert-token', tok),
      body := jsonb_build_object('kind', kind, 'table', TG_TABLE_NAME),
      timeout_milliseconds := 5000);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'superadmin notify failed: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_notify_superadmin_pending() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('payments','verification','verification_status','pending'),
    ('grading_payment_submissions','verification','status','pending_verification'),
    ('competition_payment_submissions','verification','status','pending_verification'),
    ('seminar_payment_submissions','verification','status','pending_verification'),
    ('public_chat_payment_submissions','verification','status','pending_verification'),
    ('guards_purchases','verification','sale_status','pending_verification'),
    ('student_registrations','approval','status','pending'),
    ('student_update_requests','approval','status','pending'),
    ('invoice_action_requests','approval','status','pending'),
    ('invoice_deletion_requests','approval','status','pending'),
    ('invoice_discount_approvals','approval','status','pending'),
    ('payment_deletion_requests','approval','status','pending'),
    ('submission_deletion_requests','approval','status','pending'),
    ('submission_edit_requests','approval','status','pending'),
    ('student_withdrawal_requests','approval','status','pending'),
    ('student_merge_requests','approval','status','pending'),
    ('leave_requests','approval','status','pending'),
    ('claims','approval','status','pending'),
    ('grading_deletion_requests','approval','status','pending'),
    ('slot_booking_edit_requests','approval','status','pending')
  ) AS x(tbl, kind, col, want) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_notify_superadmin_pending ON public.%I', r.tbl);
    EXECUTE format('CREATE TRIGGER trg_notify_superadmin_pending AFTER INSERT OR UPDATE OF %I ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_notify_superadmin_pending(%L,%L,%L)', r.col, r.tbl, r.kind, r.col, r.want);
  END LOOP;
END $$;