DROP FUNCTION IF EXISTS public.partner_create_approved_claim(text, numeric, text, date, text, text);

CREATE OR REPLACE FUNCTION public.partner_create_approved_claim(
  p_type text,
  p_amount numeric,
  p_description text,
  p_submitted_date date,
  p_receipt_url text,
  p_branch_id text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp_id text;
  v_id integer;
BEGIN
  v_emp_id := get_current_employee_id();
  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT is_partner() THEN
    RAISE EXCEPTION 'Only partners can record auto-approved claims';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  INSERT INTO claims (
    employee_id, type, amount, description, status,
    submitted_date, reviewed_date, reviewed_by, receipt_url, branch_id
  ) VALUES (
    v_emp_id, p_type, p_amount, p_description, 'Approved',
    p_submitted_date, now(), v_emp_id, p_receipt_url, p_branch_id
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.partner_create_approved_claim(text, numeric, text, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.partner_create_approved_claim(text, numeric, text, date, text, text) TO authenticated;
