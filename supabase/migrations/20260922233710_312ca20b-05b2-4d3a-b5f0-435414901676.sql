-- 1. Internal flag helper used only by the auto-invoicing trigger.
CREATE OR REPLACE FUNCTION public._auto_invoice_active()
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT COALESCE(current_setting('app.auto_invoice', true), '') = 'on'
$$;
REVOKE ALL ON FUNCTION public._auto_invoice_active() FROM PUBLIC, anon, authenticated;

-- 2. Failure log so staff can see what could not be invoiced automatically.
CREATE TABLE IF NOT EXISTS public.auto_invoice_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  submission_id uuid NOT NULL,
  error_message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, submission_id)
);
GRANT SELECT ON public.auto_invoice_failures TO authenticated;
GRANT ALL ON public.auto_invoice_failures TO service_role;
ALTER TABLE public.auto_invoice_failures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users can read auto invoice failures" ON public.auto_invoice_failures;
CREATE POLICY "Signed-in users can read auto invoice failures"
  ON public.auto_invoice_failures FOR SELECT TO authenticated USING (true);

-- 3. Allow the import functions to run inside the trigger (no logged-in user there).
DO $do$
DECLARE r record; newdef text;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_import_grading_submission',
                        'admin_import_competition_submission',
                        'admin_create_seminar_invoice')
  LOOP
    newdef := regexp_replace(
      r.def,
      'IF NOT public\.has_branch_access\(([^)]*)\) THEN',
      'IF NOT (public.has_branch_access(\1) OR public._auto_invoice_active()) THEN',
      'g');
    EXECUTE newdef;
  END LOOP;
END $do$;

-- 4. Trigger: invoice as soon as a submission is verified and matched.
CREATE OR REPLACE FUNCTION public.auto_invoice_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_err text;
BEGIN
  IF COALESCE(NEW.status, '') NOT IN ('verified', 'paid')
     OR NEW.matched_student_id IS NULL
     OR NEW.matched_invoice_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.auto_invoice', 'on', true);
  BEGIN
    IF TG_TABLE_NAME = 'grading_payment_submissions' THEN
      PERFORM public.admin_import_grading_submission(NEW.id, 'auto_invoice');
    ELSIF TG_TABLE_NAME = 'competition_payment_submissions' THEN
      PERFORM public.admin_import_competition_submission(NEW.id, 'auto_invoice');
    ELSIF TG_TABLE_NAME = 'seminar_payment_submissions' THEN
      PERFORM public.admin_create_seminar_invoice(NEW.id, 'auto_invoice');
    END IF;

    DELETE FROM public.auto_invoice_failures
     WHERE source = TG_TABLE_NAME AND submission_id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    INSERT INTO public.auto_invoice_failures (source, submission_id, error_message)
    VALUES (TG_TABLE_NAME, NEW.id, v_err)
    ON CONFLICT (source, submission_id)
    DO UPDATE SET error_message = EXCLUDED.error_message, updated_at = now();
  END;
  PERFORM set_config('app.auto_invoice', 'off', true);

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.auto_invoice_submission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auto_invoice_grading ON public.grading_payment_submissions;
CREATE TRIGGER trg_auto_invoice_grading
AFTER INSERT OR UPDATE OF status, matched_student_id, matched_invoice_id
ON public.grading_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_submission();

DROP TRIGGER IF EXISTS trg_auto_invoice_competition ON public.competition_payment_submissions;
CREATE TRIGGER trg_auto_invoice_competition
AFTER INSERT OR UPDATE OF status, matched_student_id, matched_invoice_id
ON public.competition_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_submission();

DROP TRIGGER IF EXISTS trg_auto_invoice_seminar ON public.seminar_payment_submissions;
CREATE TRIGGER trg_auto_invoice_seminar
AFTER INSERT OR UPDATE OF status, matched_student_id, matched_invoice_id
ON public.seminar_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_submission();