
ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS registered boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_public_competition_list(text);

CREATE OR REPLACE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, current_belt text, coaching_paid boolean, category_count integer, category_names text[], extra_categories text[], certificate_url text, proof_url text, status text, paid_status text, amount numeric, reference_number text, created_at timestamp with time zone, poomsae_1 text, poomsae_2 text, competition_at timestamp with time zone, reporting_at timestamp with time zone, court text, event_id uuid, event_name text, gender text, signature_url text, indemnity_form_url text, passport_url text, photo_url text, require_grading_card boolean, grading_card_urls text[], date_of_birth date, registered boolean)
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
    COALESCE(
      (SELECT array_agg(btrim(elem->>'label') ORDER BY ord)
       FROM jsonb_array_elements(COALESCE(cps.extra_lines, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
       WHERE COALESCE(elem->>'kind', 'category') = 'category'
         AND COALESCE(btrim(elem->>'label'), '') <> ''),
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
    cps.court,
    cps.event_id,
    ev.name,
    cps.gender,
    cps.signature_url,
    cps.indemnity_form_url,
    cps.passport_url,
    cps.photo_url,
    COALESCE(ev.require_grading_card, false),
    COALESCE(cps.grading_card_urls, '{}'::text[]),
    cps.date_of_birth,
    COALESCE(cps.registered, false)
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  LEFT JOIN public.competition_events ev ON ev.id = cps.event_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$function$;
