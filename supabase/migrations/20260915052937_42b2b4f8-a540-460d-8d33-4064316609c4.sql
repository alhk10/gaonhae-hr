-- 1. Allow hold credit types
ALTER TABLE public.student_credits DROP CONSTRAINT IF EXISTS student_credits_type_check;
ALTER TABLE public.student_credits ADD CONSTRAINT student_credits_type_check
  CHECK (type = ANY (ARRAY['overpayment','refund','item_refund','manual_adjustment','credit_applied','credit_hold','credit_hold_released','refund_pending']));

-- 2. Allow credit payment method
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method = ANY (ARRAY['cash','card','bank_transfer','online','paynow','cheque','credit']));

-- 3. Available credit helper
CREATE OR REPLACE FUNCTION public.get_student_available_credit(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM public.student_credits
  WHERE student_id = p_student_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_available_credit(uuid) TO authenticated, service_role;

-- 4. Public (session validated) read for the hello chat
CREATE OR REPLACE FUNCTION public.get_public_chat_student_credit(p_session_id uuid, p_student_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v numeric;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;
  SELECT public.get_student_available_credit(p_student_id) INTO v;
  RETURN COALESCE(v, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_chat_student_credit(uuid, uuid) TO anon, authenticated, service_role;

-- 5. Hold helpers
CREATE OR REPLACE FUNCTION public.consume_credit_hold(p_invoice_id uuid, p_actor text DEFAULT 'system')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.student_credits
     SET type = 'credit_applied',
         description = replace(description, 'Credit on hold', 'Credit applied')
   WHERE type = 'credit_hold'
     AND reference_id = p_invoice_id::text;
$$;

CREATE OR REPLACE FUNCTION public.release_credit_hold(p_invoice_id uuid, p_actor text DEFAULT 'system')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.student_credits
   WHERE type = 'credit_hold'
     AND reference_id = p_invoice_id::text;
$$;

GRANT EXECUTE ON FUNCTION public.consume_credit_hold(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_credit_hold(uuid, text) TO authenticated, service_role;
