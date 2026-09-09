CREATE OR REPLACE FUNCTION public.get_student_fee_plan_for_term(p_student_id uuid, p_term_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    WHERE i.student_id = p_student_id
      AND i.status IN ('paid','verified','partially_paid')
      AND (ii.metadata->>'term_id')::text = p_term_id::text
      AND (ii.metadata->>'payment_plan') = 'four_weeks'
  ) THEN 'four_weeks' ELSE NULL END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_fee_plan_for_term(uuid, uuid) TO anon, authenticated, service_role;