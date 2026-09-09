CREATE OR REPLACE FUNCTION public.get_public_chat_products_for_student(p_session_id uuid, p_student_id uuid, p_branch_id text, p_category_id uuid)
 RETURNS TABLE(product_id uuid, product_name text, base_price numeric, branch_price numeric, requires_size boolean, available_sizes text[], available_variants jsonb, metadata jsonb, is_term_based boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    x.product_id,
    x.product_name,
    x.base_price,
    x.branch_price,
    x.requires_size,
    x.available_sizes,
    x.available_variants,
    x.metadata,
    x.is_term_based
  FROM (
    SELECT DISTINCT ON (p.id)
      p.id AS product_id,
      p.name AS product_name,
      p.base_price,
      COALESCE(pr.price_override, p.base_price) AS branch_price,
      COALESCE(p.requires_size, false) AS requires_size,
      p.available_sizes,
      COALESCE(p.available_variants, '{}'::jsonb) AS available_variants,
      COALESCE(p.metadata, '{}'::jsonb)
        || jsonb_build_object(
             'lessons_per_week', p.lessons_per_week,
             'lesson_days', p.lesson_days,
             'allowed_class_types', p.allowed_class_types
           ) AS metadata,
      (p.category_id = v_school_fee_category
        AND COALESCE(p.is_lesson, false) = true
        AND COALESCE(p.is_adhoc_lesson, false) = false) AS is_term_based,
      EXISTS (
        SELECT 1
        FROM public.invoice_items ii
        JOIN public.invoices i ON i.id = ii.invoice_id
        WHERE ii.product_id = p.id
          AND i.student_id = p_student_id
          AND i.branch_id = p_branch_id
      ) AS previously_billed,
      pr.price_override AS sort_price_override,
      pr.updated_at AS sort_rule_updated
    FROM public.products p
    LEFT JOIN public.price_rules pr
      ON pr.product_id = p.id
     AND pr.branch_id = p_branch_id
     AND COALESCE(pr.is_active, true) = true
     AND (pr.effective_from IS NULL OR pr.effective_from <= current_date)
     AND (pr.effective_to IS NULL OR pr.effective_to >= current_date)
    WHERE COALESCE(p.is_active, true) = true
      AND p.category_id = p_category_id
      AND (
        (p_category_id = v_school_fee_category AND (
          EXISTS (
            SELECT 1
            FROM public.invoice_items ii
            JOIN public.invoices i ON i.id = ii.invoice_id
            WHERE ii.product_id = p.id
              AND i.student_id = p_student_id
              AND i.branch_id = p_branch_id
          )
          OR (
            p.name NOT IN ('Trial Lesson', 'Ad-Hoc Lesson', 'Private Lesson')
            AND EXISTS (
              SELECT 1
              FROM public.price_rules pr2
              WHERE pr2.product_id = p.id
                AND pr2.branch_id = p_branch_id
                AND pr2.is_active = true
                AND (pr2.effective_from IS NULL OR pr2.effective_from <= current_date)
                AND (pr2.effective_to IS NULL OR pr2.effective_to >= current_date)
            )
            AND (
              p.allowed_belt_levels IS NULL
              OR v_current_belt IS NULL
              OR p.allowed_belt_levels @> ARRAY[v_current_belt]::text[]
            )
          )
        ))
        OR (p_category_id = v_uniform_category
          AND v_current_belt IS NOT NULL
          AND p.allowed_belt_levels IS NOT NULL
          AND p.allowed_belt_levels @> ARRAY[v_current_belt]::text[]
        )
        OR (p_category_id = v_protection_category)
        OR (p_category_id NOT IN (v_school_fee_category, v_uniform_category, v_protection_category))
      )
    ORDER BY p.id, pr.price_override NULLS LAST, pr.updated_at DESC NULLS LAST
  ) x
  ORDER BY x.previously_billed DESC, (x.product_name ILIKE 'Gaonhae %') DESC, x.product_name ASC;
END;
$function$;