CREATE OR REPLACE FUNCTION public.get_public_guards_purchase_list()
 RETURNS TABLE(id uuid, reference_number text, first_name text, last_name text, date_of_birth date, branch_id text, branch_name text, gender text, current_belt text, email text, phone text, items jsonb, subtotal numeric, gst_amount numeric, total numeric, payment_method text, proof_url text, sale_status text, collected boolean, collected_at timestamp with time zone, collected_by text, matched_student_id uuid, invoice_id uuid, notes text, variant_selections jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, invoice_status text, invoice_number text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM (
  SELECT gp.id, gp.reference_number, gp.first_name, gp.last_name, gp.date_of_birth,
    gp.branch_id, b.name, gp.gender, gp.current_belt, gp.email, gp.phone,
    gp.items, gp.subtotal, gp.gst_amount, gp.total, gp.payment_method, gp.proof_url,
    gp.sale_status, gp.collected, gp.collected_at, gp.collected_by,
    gp.matched_student_id, gp.invoice_id, gp.notes, gp.variant_selections,
    gp.created_at, gp.updated_at, i.status::text, i.invoice_number
  FROM public.guards_purchases gp
  LEFT JOIN public.branches b ON b.id = gp.branch_id
  LEFT JOIN public.invoices i ON i.id = gp.invoice_id
  UNION ALL
  SELECT i.id, COALESCE(pay.payment_number, i.invoice_number), st.first_name, st.last_name, st.date_of_birth,
    i.branch_id, b.name, st.gender, st.current_belt, st.email, st.phone,
    (SELECT jsonb_agg(jsonb_build_object('product_id', ii.product_id, 'product_name', ii.description,
        'name', ii.description, 'size', ii.size_variant, 'qty', ii.quantity, 'quantity', ii.quantity,
        'unit_price', ii.unit_price, 'line_total', ii.total_amount))
     FROM public.invoice_items ii JOIN public.products p ON p.id = ii.product_id
     WHERE ii.invoice_id = i.id AND p.category_id IN ('cb4591b5-71fc-49cd-85ba-fce2f7d5a90c','117cdc13-1296-4651-bc4b-f0449873cbf1')),
    i.subtotal, i.tax_amount, i.total_amount, pay.payment_method, pay.proof_of_payment_url,
    CASE WHEN i.status='cancelled' THEN 'cancelled'
         WHEN pay.verification_status='rejected' THEN 'rejected'
         WHEN pay.verification_status='verified' OR i.status IN ('verified','paid') THEN 'verified'
         ELSE 'pending_verification' END,
    false, NULL::timestamptz, NULL::text, i.student_id, i.id, 'Ordered via /hello', NULL::jsonb,
    i.created_at, i.updated_at, i.status::text, i.invoice_number
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN LATERAL (SELECT p.* FROM public.payments p WHERE p.invoice_id = i.id AND p.payment_method <> 'credit' ORDER BY p.created_at DESC LIMIT 1) pay ON true
  WHERE i.created_by = 'public_hello_chat'
    AND EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.products p ON p.id = ii.product_id
                WHERE ii.invoice_id = i.id AND p.category_id IN ('cb4591b5-71fc-49cd-85ba-fce2f7d5a90c','117cdc13-1296-4651-bc4b-f0449873cbf1'))
    AND NOT EXISTS (SELECT 1 FROM public.guards_purchases g WHERE g.invoice_id = i.id)
  ) x ORDER BY x.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_grading_list(p_branch_id text DEFAULT NULL::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS TABLE(source text, submission_id uuid, registration_id uuid, slot_id uuid, branch_id text, branch_name text, branch_country text, grading_date date, start_time time without time zone, end_time time without time zone, location text, slot_title text, student_name text, current_belt text, target_belt text, paid_status text, amount numeric, proof_url text, result text, remark text, student_id uuid, certificate_name text, first_name text, last_name text, student_current_belt text, invoice_id uuid, invoice_status text, invoice_number text, scorecard jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT 'registration'::text, NULL::uuid, gr.id, gs.id,
    COALESCE(gr.branch_id, s.branch_id, gs.branch_id), COALESCE(bg.name, bs.name, b.name), COALESCE(bg.country, bs.country, b.country),
    gs.grading_date, gs.start_time, gs.end_time, gs.location, gs.title,
    COALESCE(NULLIF(btrim(gr.display_name), ''), NULLIF(btrim(s.display_name), ''), upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))))::text,
    gr.current_belt, gr.target_belt,
    CASE WHEN i.status IN ('paid','verified') THEN 'paid' ELSE 'pending verification' END,
    gps_src.amount, gps_src.proof_url, gr.result, gr.remark, s.id,
    COALESCE(NULLIF(btrim(s.certificate_name), ''), NULLIF(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), ''))::text,
    s.first_name, s.last_name, s.current_belt, ii.invoice_id, i.status, i.invoice_number, gr.scorecard::jsonb
  FROM public.grading_registrations gr
  JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  LEFT JOIN public.branches b ON b.id = gs.branch_id
  JOIN public.students s ON s.id = gr.student_id
  LEFT JOIN public.branches bs ON bs.id = s.branch_id
  LEFT JOIN public.branches bg ON bg.id = gr.branch_id
  LEFT JOIN public.invoice_items ii ON ii.id = gr.invoice_item_id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
  LEFT JOIN LATERAL (SELECT amount, proof_url FROM public.grading_payment_submissions WHERE matched_invoice_id = ii.invoice_id ORDER BY created_at DESC LIMIT 1) gps_src ON TRUE
  WHERE gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')
    AND (p_to IS NULL OR gs.grading_date <= p_to)
    AND (p_branch_id IS NULL OR COALESCE(gr.branch_id, s.branch_id, gs.branch_id) = p_branch_id)
  UNION ALL
  SELECT 'submission'::text, gps.id, NULL::uuid, gs.id, gps.branch_id, b.name, b.country,
    gs.grading_date, gs.start_time, gs.end_time, gs.location, gs.title,
    COALESCE(NULLIF(btrim(gps.display_name), ''), upper(btrim(coalesce(gps.first_name,'') || ' ' || coalesce(gps.last_name,''))))::text,
    gps.current_belt, NULL::text,
    CASE WHEN gps.status = 'verified' THEN 'paid' WHEN gps.status = 'rejected' THEN 'rejected' ELSE 'pending verification' END,
    gps.amount, gps.proof_url, gps.result, gps.remark, gps.matched_student_id, NULL::text,
    gps.first_name, gps.last_name, s2.current_belt, gps.matched_invoice_id, NULL::text, NULL::text, NULL::jsonb
  FROM public.grading_payment_submissions gps
  LEFT JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
  LEFT JOIN public.branches b ON b.id = gps.branch_id
  LEFT JOIN public.students s2 ON s2.id = gps.matched_student_id
  WHERE gps.status <> 'rejected' AND gps.matched_invoice_id IS NULL
    AND (gs.grading_date IS NULL OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days') AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)
  UNION ALL
  SELECT 'hello'::text, NULL::uuid, NULL::uuid, gs.id, i.branch_id, b.name, b.country,
    gs.grading_date, gs.start_time, gs.end_time, gs.location, gs.title,
    COALESCE(NULLIF(btrim(s.display_name), ''), upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))))::text,
    s.current_belt, NULL::text,
    CASE WHEN i.status IN ('paid','verified') THEN 'paid' WHEN i.status = 'cancelled' THEN 'rejected' ELSE 'pending verification' END,
    ii.total_amount, pay.proof_of_payment_url, NULL::text, 'Registered via /hello', s.id,
    COALESCE(NULLIF(btrim(s.certificate_name), ''), NULLIF(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), ''))::text,
    s.first_name, s.last_name, s.current_belt, i.id, i.status, i.invoice_number, NULL::jsonb
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
  JOIN public.products p ON p.id = ii.product_id AND p.category_id = '31514844-78dc-43f2-bf07-41d124d175e2'
  LEFT JOIN public.students s ON s.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN public.grading_slots gs ON gs.id = NULLIF(ii.metadata->>'grading_slot_id','')::uuid
  LEFT JOIN LATERAL (SELECT py.proof_of_payment_url FROM public.payments py WHERE py.invoice_id = i.id AND py.payment_method <> 'credit' ORDER BY py.created_at DESC LIMIT 1) pay ON true
  WHERE i.created_by = 'public_hello_chat' AND i.status <> 'cancelled'
    AND NOT EXISTS (SELECT 1 FROM public.grading_registrations g WHERE g.invoice_item_id = ii.id)
    AND (gs.grading_date IS NULL OR (gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days') AND (p_to IS NULL OR gs.grading_date <= p_to)))
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
  ORDER BY 8 NULLS LAST, 9 NULLS LAST, 6 NULLS LAST, 13;
$function$;