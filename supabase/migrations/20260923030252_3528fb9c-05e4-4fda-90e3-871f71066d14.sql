-- 1. Add invoice_status to the public list functions

DROP FUNCTION IF EXISTS public.get_public_guards_purchase_list();
DROP FUNCTION IF EXISTS public.get_public_seminar_list(text, text, uuid);
DROP FUNCTION IF EXISTS public.get_public_competition_list(text);
DROP FUNCTION IF EXISTS public.get_public_grading_list(text, date, date);

CREATE OR REPLACE FUNCTION public.get_public_guards_purchase_list()
 RETURNS TABLE(id uuid, reference_number text, first_name text, last_name text, date_of_birth date, branch_id text, branch_name text, gender text, current_belt text, email text, phone text, items jsonb, subtotal numeric, gst_amount numeric, total numeric, payment_method text, proof_url text, sale_status text, collected boolean, collected_at timestamp with time zone, collected_by text, matched_student_id uuid, invoice_id uuid, notes text, variant_selections jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, invoice_status text)
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
    gp.created_at, gp.updated_at, i.status
  FROM public.guards_purchases gp
  LEFT JOIN public.branches b ON b.id = gp.branch_id
  LEFT JOIN public.invoices i ON i.id = gp.invoice_id
  ORDER BY gp.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_seminar_list(p_branch_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, first_name text, last_name text, date_of_birth date, gender text, current_belt text, package_code text, package_label text, session_dates date[], amount numeric, discount_amount numeric, proof_url text, status text, paid_status text, collected boolean, collected_at timestamp with time zone, matched_student_id uuid, matched_invoice_id uuid, invoice_number text, reference_number text, email text, created_at timestamp with time zone, event_id uuid, event_name text, passport_url text, photo_url text, grading_card_urls text[], signature_url text, indemnity_form_url text, invoice_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.branch_id, b.name,
    upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
    s.first_name, s.last_name, s.date_of_birth, s.gender, s.current_belt,
    s.package_code, s.package_label, s.session_dates, s.amount,
    COALESCE(s.discount_amount, 0),
    s.proof_url,
    s.status,
    CASE
      WHEN s.status = 'verified' THEN 'paid'
      WHEN s.status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END,
    s.collected, s.collected_at,
    s.matched_student_id, s.matched_invoice_id, i.invoice_number,
    s.reference_number, s.email, s.created_at,
    s.event_id, e.name,
    s.passport_url, s.photo_url, COALESCE(s.grading_card_urls, '{}'::text[]),
    s.signature_url, s.indemnity_form_url,
    i.status
  FROM public.seminar_payment_submissions s
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN public.invoices i ON i.id = s.matched_invoice_id
  LEFT JOIN public.seminar_events e ON e.id = s.event_id
  WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_event_id IS NULL OR s.event_id = p_event_id)
    AND (p_status IS NULL OR
         (p_status = 'paid' AND s.status = 'verified') OR
         (p_status = 'pending' AND s.status = 'pending_verification') OR
         (p_status = 'rejected' AND s.status = 'rejected'))
  ORDER BY s.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(submission_id uuid, branch_id text, branch_name text, student_name text, current_belt text, coaching_paid boolean, category_count integer, category_names text[], extra_categories text[], certificate_url text, proof_url text, status text, paid_status text, amount numeric, reference_number text, created_at timestamp with time zone, poomsae_1 text, poomsae_2 text, competition_at timestamp with time zone, reporting_at timestamp with time zone, court text, event_id uuid, event_name text, gender text, signature_url text, indemnity_form_url text, passport_url text, photo_url text, require_grading_card boolean, grading_card_urls text[], date_of_birth date, registered boolean, matched_invoice_id uuid, matched_student_id uuid, invoice_status text)
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
    i.status
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  LEFT JOIN public.competition_events ev ON ev.id = cps.event_id
  LEFT JOIN public.invoices i ON i.id = cps.matched_invoice_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_grading_list(p_branch_id text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(source text, submission_id uuid, registration_id uuid, slot_id uuid, branch_id text, branch_name text, branch_country text, grading_date date, start_time time without time zone, end_time time without time zone, location text, slot_title text, student_name text, current_belt text, target_belt text, paid_status text, amount numeric, proof_url text, result text, remark text, student_id uuid, certificate_name text, first_name text, last_name text, student_current_belt text, invoice_id uuid, invoice_status text)
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
    i.status
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

-- 2. Public invoice detail for the refund dialog on /access

CREATE OR REPLACE FUNCTION public.get_public_invoice_detail(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'status', i.status,
    'total_amount', i.total_amount,
    'student_name', upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', it.id,
        'product_name', p.name,
        'description', it.description,
        'total_amount', it.total_amount,
        'tax_amount', it.tax_amount,
        'metadata', it.metadata
      ) ORDER BY it.created_at)
      FROM public.invoice_items it
      LEFT JOIN public.products p ON p.id = it.product_id
      WHERE it.invoice_id = i.id
    ), '[]'::jsonb)
  )
  FROM public.invoices i
  LEFT JOIN public.students s ON s.id = i.student_id
  WHERE i.id = p_invoice_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_invoice_detail(uuid) TO anon, authenticated;

-- 3. Public refund request submission (superadmin still approves)

CREATE OR REPLACE FUNCTION public.submit_public_refund_request(
  p_invoice_id uuid,
  p_item_ids uuid[],
  p_reason text,
  p_requested_by text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv RECORD;
  v_id uuid;
BEGIN
  IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No items selected';
  END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  SELECT i.id, i.invoice_number, i.status,
         upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))) AS student_name
    INTO v_inv
  FROM public.invoices i
  LEFT JOIN public.students s ON s.id = i.student_id
  WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_inv.status NOT IN ('paid', 'verified', 'partially_paid') THEN
    RAISE EXCEPTION 'Only paid or verified invoices can be refunded';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_items it
    WHERE it.invoice_id = p_invoice_id AND it.id = ANY(p_item_ids)
  ) THEN
    RAISE EXCEPTION 'Selected items do not belong to this invoice';
  END IF;

  INSERT INTO public.invoice_action_requests (
    invoice_id, action_type, request_data, requested_by, requested_by_email,
    invoice_number, student_name, status
  ) VALUES (
    p_invoice_id,
    'item_refund',
    jsonb_build_object('item_id', p_item_ids[1], 'item_ids', to_jsonb(p_item_ids), 'reason', btrim(p_reason)),
    NULL,
    NULLIF(btrim(COALESCE(p_requested_by, '')), ''),
    v_inv.invoice_number,
    v_inv.student_name,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_public_refund_request(uuid, uuid[], text, text) TO anon, authenticated;