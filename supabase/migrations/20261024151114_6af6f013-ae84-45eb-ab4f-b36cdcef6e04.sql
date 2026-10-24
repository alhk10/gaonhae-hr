DROP FUNCTION IF EXISTS public.get_public_school_fees_list(text, text);
CREATE FUNCTION public.get_public_school_fees_list(p_branch_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, student_id uuid, student_name text, contact_name text, contact_email text, contact_dob text, reference_number text, branch_id text, branch_name text, category text, items jsonb, amount numeric, payment_method text, proof_url text, status text, invoice_id uuid, invoice_number text, invoice_status text, payment_id uuid, payment_number text, payment_verification_status text, source text, origin text, scan_amount numeric, extra_proofs jsonb, paid_total numeric, overpayment_request_status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT x.*,
    CASE WHEN x.scan_amount IS NULL AND jsonb_array_length(x.extra_proofs)=0 THEN NULL
      ELSE COALESCE(x.scan_amount,0) + COALESCE((SELECT sum(NULLIF(e->>'amount','')::numeric) FROM jsonb_array_elements(x.extra_proofs) e),0) END,
    (SELECT r.status FROM public.invoice_action_requests r WHERE r.action_type='overpayment_credit'
       AND r.request_data->>'row_id' = x.id::text AND r.status IN ('pending','approved') ORDER BY r.created_at DESC LIMIT 1)
  FROM (
  SELECT s.id, s.created_at, s.matched_student_id,
    COALESCE(NULLIF(UPPER(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,''))),''),
             NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name','')||' '||COALESCE(s.items->0->>'contact_last_name',''))),'')),
    NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name','')||' '||COALESCE(s.items->0->>'contact_last_name',''))),''),
    s.items->0->>'contact_email', s.items->0->>'contact_dob', s.reference_number, s.branch_id, b.name, s.category, s.items, s.amount,
    s.payment_method, s.proof_url, s.status, inv.id, inv.invoice_number, inv.status, pay.id, pay.payment_number, pay.verification_status,
    'submission'::text, 'hello'::text, s.proof_scan_amount, s.extra_proofs
  FROM public.public_chat_payment_submissions s
  LEFT JOIN public.students st ON st.id = s.matched_student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN LATERAL (SELECT i.* FROM public.invoices i WHERE i.id = public._resolve_chat_submission_invoice(s)) inv ON true
  LEFT JOIN LATERAL (SELECT p.* FROM public.payments p WHERE p.invoice_id = inv.id ORDER BY p.created_at DESC LIMIT 1) pay ON true
  WHERE s.category = 'a416f120-4ec2-4826-8d37-375db3e002bc'
  UNION ALL
  SELECT i.id, i.created_at, i.student_id,
    NULLIF(UPPER(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,''))),''),
    NULL, st.email, st.date_of_birth::text, COALESCE(pay.payment_number, i.invoice_number), i.branch_id, b.name, NULL,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id', ii.product_id, 'product_name', split_part(ii.description,' — ',1),
        'term_name', ii.metadata->>'term_name', 'qty', ii.quantity, 'unit_price', ii.unit_price))
      FROM public.invoice_items ii WHERE ii.invoice_id = i.id), '[]'::jsonb),
    i.total_amount, pay.payment_method, pay.proof_of_payment_url,
    CASE WHEN i.status='cancelled' THEN 'cancelled'
         WHEN pay.verification_status='rejected' THEN 'rejected'
         WHEN pay.verification_status='verified' OR i.status='verified' THEN 'verified'
         ELSE 'pending_verification' END,
    i.id, i.invoice_number, i.status, pay.id, pay.payment_number, pay.verification_status, 'hello'::text,
    CASE WHEN i.created_by='public_hello_chat' OR EXISTS (SELECT 1 FROM public.payments hp WHERE hp.invoice_id=i.id AND hp.created_by='public_hello_chat') THEN 'hello'
         WHEN i.created_by IS NULL OR i.created_by ILIKE '%auto%' OR i.created_by ILIKE '%system%' OR i.created_by ILIKE '%trigger%' THEN 'auto'
         ELSE 'manual' END,
    pay.proof_scan_amount, COALESCE(pay.extra_proofs,'[]'::jsonb)
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN LATERAL (
    SELECT p.* FROM public.payments p WHERE p.invoice_id = i.id AND p.payment_method <> 'credit'
    ORDER BY (p.created_by = 'public_hello_chat') DESC, p.created_at DESC LIMIT 1) pay ON true
  WHERE i.student_id IS NOT NULL
    AND (
      i.created_by = 'public_hello_chat'
      OR EXISTS (SELECT 1 FROM public.payments hp WHERE hp.invoice_id = i.id AND hp.created_by = 'public_hello_chat')
      OR (
        EXISTS (SELECT 1 FROM public.invoice_items ii JOIN public.products pr ON pr.id = ii.product_id
                WHERE ii.invoice_id = i.id AND pr.category_id::text = 'a416f120-4ec2-4826-8d37-375db3e002bc')
        AND (EXISTS (SELECT 1 FROM public.payments p2 WHERE p2.invoice_id = i.id AND p2.payment_method <> 'credit')
             OR i.status IN ('paid','verified','partially_paid'))
      )
    )
  ) x(id, created_at, student_id, student_name, contact_name, contact_email, contact_dob, reference_number, branch_id, branch_name, category, items, amount, payment_method, proof_url, status, invoice_id, invoice_number, invoice_status, payment_id, payment_number, payment_verification_status, source, origin, scan_amount, extra_proofs)
  WHERE (p_branch_id IS NULL OR x.branch_id = p_branch_id)
    AND (p_status IS NULL OR x.status = p_status)
  ORDER BY x.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_school_fees_list(text, text) TO anon, authenticated, service_role;