CREATE OR REPLACE FUNCTION public.admin_replace_school_fees_proof(p_id uuid, p_proof_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.public_chat_payment_submissions
  SET proof_url = p_proof_url
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'School fee submission not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_replace_guards_proof(p_id uuid, p_proof_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guards_purchases
  SET proof_url = p_proof_url
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guards purchase not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_replace_school_fees_proof(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_guards_proof(uuid, text) TO anon, authenticated;