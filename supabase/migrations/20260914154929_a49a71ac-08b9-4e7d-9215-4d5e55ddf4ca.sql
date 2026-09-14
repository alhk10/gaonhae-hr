CREATE OR REPLACE FUNCTION public.is_blocked_public_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(btrim(coalesce(p_email, ''))) IN (
    'gaonhaetaekwondo@gmail.com',
    'management@gaonhaetaekwondo.com',
    'hello@gaonhaetaekwondo.com',
    'kem.gaonhaetaekwondo@gmail.com',
    'ysn.gaonhaetaekwondo@gmail.com',
    'bkm.gaonhaetaekwondo@gmail.com',
    'jw.gaonhaetaekwondo@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.reject_blocked_public_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_blocked_public_email(NEW.email) THEN
    RAISE EXCEPTION 'Please use your own email address, not a school address.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_school_email ON public.grading_payment_submissions;
CREATE TRIGGER trg_block_school_email
BEFORE INSERT OR UPDATE OF email ON public.grading_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_public_email();

DROP TRIGGER IF EXISTS trg_block_school_email ON public.competition_payment_submissions;
CREATE TRIGGER trg_block_school_email
BEFORE INSERT OR UPDATE OF email ON public.competition_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_public_email();

DROP TRIGGER IF EXISTS trg_block_school_email ON public.seminar_payment_submissions;
CREATE TRIGGER trg_block_school_email
BEFORE INSERT OR UPDATE OF email ON public.seminar_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_public_email();

DROP TRIGGER IF EXISTS trg_block_school_email ON public.guards_purchases;
CREATE TRIGGER trg_block_school_email
BEFORE INSERT OR UPDATE OF email ON public.guards_purchases
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_public_email();

DROP TRIGGER IF EXISTS trg_block_school_email ON public.public_chat_sessions;
CREATE TRIGGER trg_block_school_email
BEFORE INSERT OR UPDATE OF email ON public.public_chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_public_email();