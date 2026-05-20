CREATE OR REPLACE FUNCTION public.get_student_completed_grading_stages(p_student_id uuid)
RETURNS TABLE(stage_number integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT (regexp_match(p.name, '^\s*Stage\s+(\d+)', 'i'))[1]::int AS stage_number
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
  JOIN public.products p ON p.id = ii.product_id
  WHERE i.student_id = p_student_id
    AND i.status IN ('paid','verified')
    AND p.name ~* '^\s*Stage\s+\d+'
$$;

GRANT EXECUTE ON FUNCTION public.get_student_completed_grading_stages(uuid) TO anon, authenticated;