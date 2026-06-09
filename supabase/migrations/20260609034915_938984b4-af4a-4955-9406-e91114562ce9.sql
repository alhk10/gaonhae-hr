DROP FUNCTION IF EXISTS public.get_public_competition_list(text);

CREATE OR REPLACE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, current_belt text, coaching_paid boolean, category_count integer, category_names text[], certificate_url text, proof_url text, status text, paid_status text, amount numeric, reference_number text, created_at timestamp with time zone, poomsae_1 text, poomsae_2 text, competition_at timestamp with time zone, reporting_at timestamp with time zone, court text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cps.id,
    cps.branch_id,
    b.name,
    upper(btrim(coalesce(cps.first_name,'') || ' ' || coalesce(cps.last_name,''))),
    cps.current_belt,
    (cps.coaching_product_id IS NOT NULL),
    COALESCE(array_length(cps.category_product_ids, 1), 0),
    COALESCE(
      (SELECT array_agg(p.name ORDER BY p.name)
       FROM public.products p
       WHERE p.id = ANY(cps.category_product_ids)),
      '{}'::text[]
    ),
    cps.certificate_url,
    cps.proof_url,
    cps.status,
    CASE
      WHEN cps.status = 'verified' THEN 'paid'
      WHEN cps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END,
    cps.amount,
    cps.reference_number,
    cps.created_at,
    cps.poomsae_1,
    cps.poomsae_2,
    cps.competition_at,
    cps.reporting_at,
    cps.court
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$function$;