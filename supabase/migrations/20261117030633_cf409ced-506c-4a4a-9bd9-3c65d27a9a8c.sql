CREATE OR REPLACE FUNCTION public.sibling_discount_used(p_student_id uuid, p_term_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.student_id = p_student_id AND coalesce(i.status,'') NOT IN ('cancelled','refunded')
      AND ii.metadata->>'term_id' = p_term_id::text
      AND (coalesce(ii.metadata->>'sibling_discount','') NOT IN ('', 'false', '0')
           OR coalesce((ii.metadata->>'sibling_discount_amount')::numeric,0) > 0
           OR (ii.metadata->>'payment_plan' = 'four_weeks' AND coalesce((ii.metadata->>'plan_discount')::numeric,0) > 0)
           OR coalesce((ii.metadata->>'plan_discount')::numeric,0) >= 20
           OR (ii.metadata->'line_discount'->>'discount_type' = 'amount'
               AND coalesce((ii.metadata->'line_discount'->>'discount_value')::numeric,0) >= 20))
  );
$$;