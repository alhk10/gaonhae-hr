DROP FUNCTION IF EXISTS public.get_public_competition_list(text);
CREATE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, current_belt text, coaching_paid boolean, category_count integer, category_names text[], extra_categories text[], certificate_url text, proof_url text, status text, paid_status text, amount numeric, reference_number text, created_at timestamp with time zone, poomsae_1 text, poomsae_2 text, competition_at timestamp with time zone, reporting_at timestamp with time zone, court text, event_id uuid, event_name text, gender text, signature_url text, indemnity_form_url text, passport_url text, photo_url text, require_grading_card boolean, grading_card_urls text[], date_of_birth date, registered boolean, matched_invoice_id uuid, matched_student_id uuid, invoice_status text, invoice_number text)
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
    COALESCE(cps.registered, false),
    cps.matched_invoice_id,
    cps.matched_student_id,
    i.status,
    i.invoice_number
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  LEFT JOIN public.competition_events ev ON ev.id = cps.event_id
  LEFT JOIN public.invoices i ON i.id = cps.matched_invoice_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_competition_list(text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_public_guards_purchase_list();
CREATE FUNCTION public.get_public_guards_purchase_list()
 RETURNS TABLE(id uuid, reference_number text, first_name text, last_name text, date_of_birth date, branch_id text, branch_name text, gender text, current_belt text, email text, phone text, items jsonb, subtotal numeric, gst_amount numeric, total numeric, payment_method text, proof_url text, sale_status text, collected boolean, collected_at timestamp with time zone, collected_by text, matched_student_id uuid, invoice_id uuid, notes text, variant_selections jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, invoice_status text, invoice_number text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    gp.id, gp.reference_number, gp.first_name, gp.last_name, gp.date_of_birth,
    gp.branch_id, b.name AS branch_name, gp.gender, gp.current_belt, gp.email, gp.phone,
    gp.items, gp.subtotal, gp.gst_amount, gp.total, gp.payment_method, gp.proof_url,
    gp.sale_status, gp.collected, gp.collected_at, gp.collected_by,
    gp.matched_student_id, gp.invoice_id, gp.notes, gp.variant_selections,
    gp.created_at, gp.updated_at, i.status, i.invoice_number
  FROM public.guards_purchases gp
  LEFT JOIN public.branches b ON b.id = gp.branch_id
  LEFT JOIN public.invoices i ON i.id = gp.invoice_id
  ORDER BY gp.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_guards_purchase_list() TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_public_grading_list(text, date, date);
CREATE FUNCTION public.get_public_grading_list(p_branch_id text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(source text, submission_id uuid, registration_id uuid, slot_id uuid, branch_id text, branch_name text, branch_country text, grading_date date, start_time time without time zone, end_time time without time zone, location text, slot_title text, student_name text, current_belt text, target_belt text, paid_status text, amount numeric, proof_url text, result text, remark text, student_id uuid, certificate_name text, first_name text, last_name text, student_current_belt text, invoice_id uuid, invoice_status text, invoice_number text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    'registration'::text,
    NULL::uuid,
    gr.id,
    gs.id,
    COALESCE(gr.branch_id, s.branch_id, gs.branch_id),
    COALESCE(bg.name, bs.name, b.name),
    COALESCE(bg.country, bs.country, b.country),
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    gs.title,
    COALESCE(
      NULLIF(btrim(gr.display_name), ''),
      NULLIF(btrim(s.display_name), ''),
      upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')))
    )::text,
    gr.current_belt,
    gr.target_belt,
    CASE
      WHEN i.status IN ('paid','verified') THEN 'paid'
      ELSE 'pending verification'
    END,
    gps_src.amount,
    gps_src.proof_url,
    gr.result,
    gr.remark,
    s.id,
    COALESCE(
      NULLIF(btrim(s.certificate_name), ''),
      NULLIF(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), '')
    )::text,
    s.first_name,
    s.last_name,
    s.current_belt,
    ii.invoice_id,
    i.status,
    i.invoice_number
  FROM public.grading_registrations gr
  JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  LEFT JOIN public.branches b ON b.id = gs.branch_id
  JOIN public.students s ON s.id = gr.student_id
  LEFT JOIN public.branches bs ON bs.id = s.branch_id
  LEFT JOIN public.branches bg ON bg.id = gr.branch_id
  LEFT JOIN public.invoice_items ii ON ii.id = gr.invoice_item_id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
  LEFT JOIN LATERAL (
    SELECT amount, proof_url
    FROM public.grading_payment_submissions
    WHERE matched_invoice_id = ii.invoice_id
    ORDER BY created_at DESC
    LIMIT 1
  ) gps_src ON TRUE
  WHERE gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
    AND (p_to IS NULL OR gs.grading_date <= p_to)
    AND (p_branch_id IS NULL OR COALESCE(gr.branch_id, s.branch_id, gs.branch_id) = p_branch_id)

  UNION ALL

  SELECT
    'submission'::text,
    gps.id,
    NULL::uuid,
    gs.id,
    gps.branch_id,
    b.name,
    b.country,
    gs.grading_date,
    gs.start_time,
    gs.end_time,
    gs.location,
    gs.title,
    COALESCE(
      NULLIF(btrim(gps.display_name), ''),
      upper(btrim(coalesce(gps.first_name,'') || ' ' || coalesce(gps.last_name,'')))
    )::text,
    gps.current_belt,
    NULL::text,
    CASE
      WHEN gps.status = 'verified' THEN 'paid'
      WHEN gps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END,
    gps.amount,
    gps.proof_url,
    gps.result,
    gps.remark,
    gps.matched_student_id,
    NULL::text,
    gps.first_name,
    gps.last_name,
    s2.current_belt,
    gps.matched_invoice_id,
    NULL::text,
    NULL::text
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  LEFT JOIN public.students s2 ON s2.id = gps.matched_student_id
  WHERE gps.status <> 'rejected'
    AND gps.matched_invoice_id IS NULL
    AND (gs.grading_date IS NULL
         OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
             AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)

  ORDER BY 8 NULLS LAST, 9 NULLS LAST, 6 NULLS LAST, 13;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_grading_list(text, date, date) TO anon, authenticated, service_role;