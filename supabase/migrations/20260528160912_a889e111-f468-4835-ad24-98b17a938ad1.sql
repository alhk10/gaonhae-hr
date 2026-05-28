
ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS poomsae_1 text,
  ADD COLUMN IF NOT EXISTS poomsae_2 text;

CREATE OR REPLACE FUNCTION public.admin_update_competition_poomsae(
  p_id uuid,
  p_poomsae_1 text,
  p_poomsae_2 text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.competition_payment_submissions
     SET poomsae_1 = NULLIF(btrim(coalesce(p_poomsae_1,'')), ''),
         poomsae_2 = NULLIF(btrim(coalesce(p_poomsae_2,'')), ''),
         updated_at = now()
   WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_competition_poomsae(uuid, text, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_public_competition_list(text);

CREATE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, current_belt text, coaching_paid boolean, category_count integer, category_names text[], certificate_url text, proof_url text, status text, paid_status text, amount numeric, reference_number text, created_at timestamp with time zone, poomsae_1 text, poomsae_2 text)
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
    cps.poomsae_2
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_competition_list(text) TO anon, authenticated, service_role;
