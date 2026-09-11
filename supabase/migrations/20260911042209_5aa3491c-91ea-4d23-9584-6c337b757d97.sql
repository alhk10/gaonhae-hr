CREATE OR REPLACE FUNCTION public.get_public_chat_latest_fee_preference(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  payment_plan text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_fee_category uuid := 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    CASE
      WHEN ii.metadata->>'payment_plan' IN ('four_weeks', 'term')
        THEN ii.metadata->>'payment_plan'
      WHEN COALESCE(NULLIF(ii.metadata->>'weeks', '')::numeric, ii.quantity) = 4
        THEN 'four_weeks'
      ELSE 'term'
    END AS payment_plan
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
  JOIN public.products p ON p.id = ii.product_id
  WHERE i.student_id = p_student_id
    AND i.branch_id = p_branch_id
    AND i.status <> 'cancelled'
    AND p.category_id = v_school_fee_category
    AND COALESCE(p.is_lesson, false) = true
    AND COALESCE(p.is_adhoc_lesson, false) = false
    AND (ii.metadata->>'term_id') IS NOT NULL
  ORDER BY i.created_at DESC, ii.created_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_chat_latest_fee_preference(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_chat_latest_fee_preference(uuid, uuid, text) TO anon, authenticated, service_role;