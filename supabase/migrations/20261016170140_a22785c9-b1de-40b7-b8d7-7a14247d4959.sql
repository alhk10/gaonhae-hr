ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS paid_in_payroll_month text;

CREATE OR REPLACE FUNCTION public.mark_claims_paid_for_payroll(_employee_ids text[], _month text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'superadmin') OR public.is_superadmin(auth.jwt()->>'email')) THEN
    RAISE EXCEPTION 'Only superadmin can finalise payroll';
  END IF;
  UPDATE public.claims SET paid_in_payroll_month = _month
   WHERE employee_id = ANY(_employee_ids) AND status = 'Approved' AND paid_in_payroll_month IS NULL
     AND to_char(coalesce(submitted_date, created_at) AT TIME ZONE 'Asia/Singapore','YYYY-MM') <= _month;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.mark_claims_paid_for_payroll(text[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_claims_paid_for_payroll(text[], text) TO authenticated;