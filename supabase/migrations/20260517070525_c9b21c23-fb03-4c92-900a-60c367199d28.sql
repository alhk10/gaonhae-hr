CREATE OR REPLACE FUNCTION public.get_public_grading_products(p_branch_id text, p_current_belts text[], p_target_belts text[] DEFAULT NULL)
 RETURNS TABLE(current_belt text, product_id uuid, product_name text, base_price numeric, branch_price numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH belt_input AS (
    SELECT
      bi.belt,
      CASE WHEN p_target_belts IS NOT NULL THEN p_target_belts[bi.idx] ELSE NULL END AS target
    FROM unnest(p_current_belts) WITH ORDINALITY AS bi(belt, idx)
  ),
  matched AS (
    SELECT
      bi.belt AS current_belt,
      p.id AS product_id,
      p.name AS product_name,
      p.base_price,
      row_number() OVER (PARTITION BY bi.belt ORDER BY length(p.name)) AS rn
    FROM belt_input bi
    JOIN public.products p ON p.is_active = true
    JOIN public.product_categories pc ON pc.id = p.category_id
    WHERE lower(pc.name) = 'grading'
      AND (
        (bi.target IS NOT NULL AND lower(p.name) = lower(bi.belt || ' >> ' || bi.target))
        OR
        (bi.target IS NULL AND lower(p.name) LIKE lower(bi.belt || ' >>%'))
      )
  )
  SELECT
    m.current_belt,
    m.product_id,
    m.product_name,
    m.base_price,
    COALESCE(
      (
        SELECT pr.price_override
        FROM public.price_rules pr
        WHERE pr.product_id = m.product_id
          AND pr.is_active = true
          AND pr.branch_id = p_branch_id
          AND pr.price_override IS NOT NULL
          AND (pr.effective_from IS NULL OR pr.effective_from <= CURRENT_DATE)
          AND (pr.effective_to IS NULL OR pr.effective_to >= CURRENT_DATE)
        ORDER BY pr.updated_at DESC NULLS LAST, pr.created_at DESC NULLS LAST
        LIMIT 1
      ),
      m.base_price
    ) AS branch_price
  FROM matched m
  WHERE m.rn = 1;
$function$;