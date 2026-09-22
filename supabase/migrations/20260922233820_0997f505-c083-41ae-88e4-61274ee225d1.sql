CREATE OR REPLACE FUNCTION public.auto_invoice_school_fees()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_err text;
BEGIN
  IF COALESCE(NEW.status, '') NOT IN ('verified', 'paid') OR NEW.matched_student_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF public._resolve_chat_submission_invoice(NEW) IS NOT NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    PERFORM public.admin_match_school_fees_submission(NEW.id, NEW.matched_student_id, 'auto_invoice');
    DELETE FROM public.auto_invoice_failures
     WHERE source = TG_TABLE_NAME AND submission_id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    INSERT INTO public.auto_invoice_failures (source, submission_id, error_message)
    VALUES (TG_TABLE_NAME, NEW.id, v_err)
    ON CONFLICT (source, submission_id)
    DO UPDATE SET error_message = EXCLUDED.error_message, updated_at = now();
  END;

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.auto_invoice_school_fees() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auto_invoice_school_fees ON public.public_chat_payment_submissions;
CREATE TRIGGER trg_auto_invoice_school_fees
AFTER INSERT OR UPDATE OF status, matched_student_id
ON public.public_chat_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_school_fees();