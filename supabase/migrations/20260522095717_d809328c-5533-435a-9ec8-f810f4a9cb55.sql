CREATE OR REPLACE FUNCTION public.get_public_chat_products_for_student(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text,
  p_category_id uuid
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  base_price numeric,
  branch_price numeric,
  requires_size boolean,
  available_sizes text[],
  available_variants jsonb,
  metadata jsonb,
  is_term_based boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_belt text;
  v_school_fee_category uuid := 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid;
  v_uniform_category uuid := 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c'::uuid;
  v_protection_category uuid := '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN;
  END IF;

  SELECT s.current_belt INTO v_current_belt
  FROM public.students s
  WHERE s.id = p_student_id;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.base_price,
    COALESCE(pr.price_override, p.base_price) AS branch_price,
    COALESCE(p.requires_size, false),
    p.available_sizes,
    COALESCE(p.available_variants, '{}'::jsonb),
    COALESCE(p.metadata, '{}'::jsonb),
    (p.category_id = v_school_fee_category
      AND COALESCE(p.is_lesson, false) = true
      AND COALESCE(p.is_adhoc_lesson, false) = false) AS is_term_based
  FROM public.products p
  LEFT JOIN public.price_rules pr
    ON pr.product_id = p.id
   AND pr.branch_id = p_branch_id
   AND COALESCE(pr.is_active, true) = true
  WHERE COALESCE(p.is_active, true) = true
    AND p.category_id = p_category_id
    AND (
      (p_category_id = v_school_fee_category AND EXISTS (
        SELECT 1
        FROM public.invoice_items ii
        JOIN public.invoices i ON i.id = ii.invoice_id
        WHERE ii.product_id = p.id
          AND i.student_id = p_student_id
          AND i.branch_id = p_branch_id
      ))
      OR (p_category_id = v_uniform_category
        AND v_current_belt IS NOT NULL
        AND p.allowed_belt_levels IS NOT NULL
        AND p.allowed_belt_levels @> ARRAY[v_current_belt]::text[]
      )
      OR (p_category_id = v_protection_category)
      OR (p_category_id NOT IN (v_school_fee_category, v_uniform_category, v_protection_category))
    )
  ORDER BY p.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_chat_terms_for_student(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text
)
RETURNS TABLE(
  term_id uuid,
  term_name text,
  start_date date,
  end_date date,
  total_weeks integer,
  is_paid boolean
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
    t.id,
    t.name,
    t.start_date,
    t.end_date,
    COALESCE(t.total_weeks, GREATEST(1, CEIL((t.end_date - t.start_date + 1)::numeric / 7)::integer)) AS total_weeks,
    EXISTS (
      SELECT 1
      FROM public.invoice_items ii
      JOIN public.invoices i ON i.id = ii.invoice_id
      JOIN public.products p ON p.id = ii.product_id
      WHERE i.student_id = p_student_id
        AND i.branch_id = p_branch_id
        AND i.status IN ('paid','verified','partially_paid')
        AND (ii.metadata->>'term_id') IS NOT NULL
        AND (ii.metadata->>'term_id')::uuid = t.id
        AND p.category_id = v_school_fee_category
        AND COALESCE(p.is_lesson, false) = true
        AND COALESCE(p.is_adhoc_lesson, false) = false
    ) AS is_paid
  FROM public.term_calendars t
  WHERE t.branch_id = p_branch_id
    AND COALESCE(t.is_active, true) = true
    AND t.end_date >= CURRENT_DATE
  ORDER BY t.start_date ASC
  LIMIT 6;
END;
$$;