ALTER TABLE public.invoices ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_reference text;

CREATE OR REPLACE FUNCTION public.validate_invoice_customer()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.customer_type NOT IN ('student','external') THEN RAISE EXCEPTION 'Invalid customer type'; END IF;
  IF NEW.customer_type = 'student' AND NEW.student_id IS NULL THEN RAISE EXCEPTION 'Student invoices need a student'; END IF;
  IF NEW.customer_type = 'external' AND coalesce(btrim(NEW.customer_name),'') = '' THEN RAISE EXCEPTION 'External invoices need a customer name'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_invoice_customer ON public.invoices;
CREATE TRIGGER trg_validate_invoice_customer BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_customer();

ALTER TABLE public.studio_rental_submissions
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id uuid;

CREATE OR REPLACE FUNCTION public._studio_rental_product(p_sku text, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  SELECT id INTO v FROM public.products WHERE sku = p_sku LIMIT 1;
  IF v IS NULL THEN
    INSERT INTO public.products(sku, name, base_price, tax_rate, is_active, is_service)
    VALUES (p_sku, p_name, 0, 0, true, true) RETURNING id INTO v;
  END IF;
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public._studio_rental_product(text,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._studio_rental_create_invoice(p_id uuid, p_by text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.studio_rental_submissions%ROWTYPE; v_inv uuid; v_pay uuid; v_rent uuid; v_dep uuid;
  v_gst_rate numeric; v_incl boolean; s jsonb; v_hours numeric; v_rate numeric; v_line numeric; v_tax numeric;
  v_sub numeric; v_tax_total numeric := 0; v_date date;
BEGIN
  SELECT * INTO r FROM public.studio_rental_submissions WHERE id = p_id FOR UPDATE;
  IF r.invoice_id IS NOT NULL THEN RETURN r.invoice_id; END IF;
  v_gst_rate := coalesce((r.pricing->>'gst_rate')::numeric, 0);
  v_incl := coalesce((r.pricing->>'gst_inclusive')::boolean, false);
  v_rent := public._studio_rental_product('STUDIO-RENTAL', 'Studio Rental');
  v_dep := public._studio_rental_product('STUDIO-RENTAL-DEPOSIT', 'Rental Deposit');
  v_sub := r.total_amount - CASE WHEN v_incl THEN 0 ELSE r.gst_amount END - CASE WHEN v_incl THEN r.gst_amount ELSE 0 END;

  INSERT INTO public.invoices(invoice_number, student_id, customer_type, customer_name, customer_email, customer_phone, customer_reference,
    branch_id, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due, issue_date, due_date,
    notes, created_by)
  VALUES (public._next_invoice_number(), NULL, 'external', upper(r.renter_name), r.email, r.contact_number, r.nric_uen,
    r.branch_id, 'unpaid', round(v_sub,2), r.gst_amount, 0, r.total_amount, 0, r.total_amount, CURRENT_DATE, CURRENT_DATE,
    'Studio rental ' || r.reference_number || ' · NRIC/UEN ' || r.nric_uen, 'studio_rental')
  RETURNING id INTO v_inv;

  FOR s IN SELECT e FROM jsonb_array_elements(r.sessions) e LOOP
    v_date := (s->>'date')::date;
    v_hours := coalesce((s->>'hours')::numeric, extract(epoch FROM ((s->>'end')::time - (s->>'start')::time))/3600.0);
    SELECT coalesce((m->>'rate')::numeric, 0) INTO v_rate FROM jsonb_array_elements(coalesce(r.pricing->'months','[]'::jsonb)) m
      WHERE m->>'month' = to_char(v_date,'YYYY-MM') LIMIT 1;
    v_rate := coalesce(v_rate, (r.pricing->>'hourly_rate')::numeric, 0);
    v_line := round(v_hours * v_rate, 2);
    IF v_incl THEN v_tax := round(v_line * v_gst_rate / (1 + v_gst_rate), 2);
    ELSE v_tax := round(v_line * v_gst_rate, 2); v_line := v_line + v_tax; END IF;
    v_tax_total := v_tax_total + v_tax;
    INSERT INTO public.invoice_items(invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, metadata, created_by)
    VALUES (v_inv, v_rent, 'Studio rental ' || to_char(v_date,'DD/MM/YYYY') || ' ' || (s->>'start') || '–' || (s->>'end') || ' (' || v_hours || 'h @ $' || v_rate || '/h)',
      1, v_line, v_gst_rate, v_tax, v_line, jsonb_build_object('studio_rental_id', r.id), 'studio_rental');
  END LOOP;
  IF r.deposit_amount > 0 THEN
    INSERT INTO public.invoice_items(invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, metadata, created_by)
    VALUES (v_inv, v_dep, 'Refundable rental deposit', 1, r.deposit_amount, 0, 0, r.deposit_amount, jsonb_build_object('studio_rental_id', r.id), 'studio_rental');
  END IF;

  INSERT INTO public.payments(invoice_id, payment_method, amount, payment_date, reference_number, proof_of_payment_url, notes,
    processed_by, created_by, is_verified, verified_by, verified_at, verification_status)
  VALUES (v_inv, r.payment_method, r.total_amount, CURRENT_DATE, r.reference_number, r.proof_url, 'Studio rental payment',
    left(coalesce(p_by,'access'),100), 'studio_rental', true, left(coalesce(p_by,'access'),100), now(), 'verified')
  RETURNING id INTO v_pay;

  UPDATE public.invoices SET amount_paid = r.total_amount, balance_due = 0, status = 'verified', updated_at = now() WHERE id = v_inv;
  UPDATE public.studio_rental_submissions SET invoice_id = v_inv, payment_id = v_pay WHERE id = p_id;
  RETURN v_inv;
END $$;
REVOKE EXECUTE ON FUNCTION public._studio_rental_create_invoice(uuid,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_studio_rental(p_id uuid, p_status text, p_by text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv uuid;
BEGIN
  IF p_status NOT IN ('verified','rejected','pending_verification') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.studio_rental_submissions SET status=p_status, reviewed_by=left(coalesce(p_by,'access'),100),
    reviewed_at=now(), review_note=left(p_note,500), updated_at=now() WHERE id=p_id RETURNING invoice_id INTO v_inv;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rental not found'; END IF;
  IF p_status = 'verified' THEN
    PERFORM public._studio_rental_create_invoice(p_id, p_by);
  ELSIF v_inv IS NOT NULL THEN
    UPDATE public.invoices SET status='cancelled', updated_at=now(),
      internal_notes = concat_ws(E'\n', internal_notes, 'Rental ' || p_status || ' by ' || coalesce(p_by,'access'))
     WHERE id = v_inv;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_review_studio_rental(uuid,text,text,text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_studio_rental_list(text);
CREATE FUNCTION public.get_studio_rental_list(p_branch_id text DEFAULT NULL)
RETURNS TABLE(id uuid, reference_number text, branch_id text, branch_name text, renter_name text, nric_uen text, contact_number text,
  email text, sessions jsonb, total_hours numeric, rental_amount numeric, deposit_amount numeric, gst_amount numeric, total_amount numeric,
  payment_method text, proof_url text, status text, reviewed_by text, reviewed_at timestamptz, review_note text, signed_at timestamptz, created_at timestamptz,
  invoice_id uuid, invoice_number text, invoice_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id,s.reference_number,s.branch_id,b.name,s.renter_name,s.nric_uen,s.contact_number,s.email,s.sessions,s.total_hours,
    s.rental_amount,s.deposit_amount,s.gst_amount,s.total_amount,s.payment_method,s.proof_url,s.status,s.reviewed_by,s.reviewed_at,
    s.review_note,s.signed_at,s.created_at, i.id, i.invoice_number, i.status
  FROM public.studio_rental_submissions s JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN public.invoices i ON i.id = s.invoice_id
  WHERE p_branch_id IS NULL OR s.branch_id = p_branch_id ORDER BY s.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_studio_rental_list(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_invoice_full(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_invoice_id IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'id', i.id, 'invoice_number', i.invoice_number, 'issue_date', i.issue_date, 'due_date', i.due_date,
    'subtotal', COALESCE(i.subtotal, 0), 'tax_amount', COALESCE(i.tax_amount, 0),
    'discount_amount', COALESCE(i.discount_amount, 0), 'total_amount', COALESCE(i.total_amount, 0),
    'amount_paid', COALESCE(i.amount_paid, 0), 'balance_due', COALESCE(i.balance_due, 0),
    'notes', i.notes, 'status', i.status, 'customer_type', i.customer_type,
    'student', CASE WHEN i.student_id IS NULL THEN jsonb_build_object(
        'name', COALESCE(i.customer_name, ''), 'address', NULL, 'phone', i.customer_phone, 'email', i.customer_email)
      ELSE jsonb_build_object(
      'name', COALESCE(COALESCE(NULLIF(trim(concat_ws(' ', st.first_name, st.last_name)), ''), st.display_name), ''),
      'address', st.address, 'phone', st.phone, 'email', st.email) END,
    'branch', jsonb_build_object('name', COALESCE(b.name, ''), 'address', b.address, 'country', b.country),
    'template', CASE WHEN tmpl.id IS NULL THEN NULL ELSE jsonb_build_object(
      'country', tmpl.country, 'letterhead_url', tmpl.letterhead_url, 'logo_url', tmpl.logo_url,
      'paynow_qr_url', tmpl.paynow_qr_url, 'bank_transfer_info', tmpl.bank_transfer_info,
      'default_notes', tmpl.default_notes, 'footer_text', tmpl.footer_text) END,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'description', it.description, 'quantity', COALESCE(it.quantity, 1),
        'unit_price', COALESCE(it.unit_price, 0), 'total_price', COALESCE(it.total_amount, 0),
        'refunded', COALESCE(it.metadata->>'refunded','false') = 'true'
      ) ORDER BY it.created_at)
      FROM public.invoice_items it WHERE it.invoice_id = i.id), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'payment_number', p.payment_number, 'payment_method', p.payment_method, 'payment_date', p.payment_date,
        'amount', COALESCE(p.amount, 0), 'reference_number', p.reference_number,
        'verification_status', p.verification_status) ORDER BY p.payment_date)
      FROM public.payments p WHERE p.invoice_id = i.id), '[]'::jsonb)
  ) INTO v_result
  FROM public.invoices i
  LEFT JOIN public.students st ON st.id = i.student_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  LEFT JOIN LATERAL (
    SELECT t.id, t.country, t.letterhead_url, t.logo_url, t.paynow_qr_url,
           t.bank_transfer_info, t.default_notes, t.footer_text
    FROM public.invoice_templates t
    WHERE t.is_active AND t.country = CASE WHEN b.country IN ('Australia', 'AU') THEN 'AU' WHEN b.country IN ('Singapore', 'SG') THEN 'SG' ELSE NULL END
    ORDER BY t.created_at DESC LIMIT 1
  ) tmpl ON true
  WHERE i.id = p_invoice_id;
  RETURN v_result;
END;
$function$;