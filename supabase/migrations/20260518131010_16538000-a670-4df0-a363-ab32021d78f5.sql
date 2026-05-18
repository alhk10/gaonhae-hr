
CREATE OR REPLACE FUNCTION public.submit_grading_payments(_rows jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.grading_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt, resolved_product_id, resolved_grading_slot_id,
    amount, payment_method, proof_url, status
  )
  SELECT
    (r->>'first_name')::text,
    (r->>'last_name')::text,
    NULLIF(r->>'email',''),
    (r->>'branch_id')::text,
    (r->>'date_of_birth')::date,
    NULLIF(r->>'current_belt',''),
    NULLIF(r->>'resolved_product_id','')::uuid,
    NULLIF(r->>'resolved_grading_slot_id','')::uuid,
    NULLIF(r->>'amount','')::numeric,
    COALESCE(NULLIF(r->>'payment_method',''), 'paynow'),
    NULLIF(r->>'proof_url',''),
    COALESCE(NULLIF(r->>'status',''), 'pending_verification')
  FROM jsonb_array_elements(_rows) AS r
  RETURNING grading_payment_submissions.id, grading_payment_submissions.reference_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_grading_payments(jsonb) TO anon, authenticated;
