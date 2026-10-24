-- Fingerprint of /hello cart items (product + size), used to spot repeat submissions.
CREATE OR REPLACE FUNCTION public._hello_items_fingerprint(p_items jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT string_agg(k, '|' ORDER BY k) FROM (
    SELECT (e->>'product_id') || ':' || upper(COALESCE(NULLIF(e->>'size_variant',''), NULLIF(e->>'size',''), NULLIF(e->>'variant',''), '')) AS k
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) e
    WHERE NULLIF(e->>'product_id','') IS NOT NULL
  ) s
$$;

DROP FUNCTION IF EXISTS public.submit_public_chat_invoice(uuid, uuid, text, text, jsonb, numeric, text, text);

CREATE OR REPLACE FUNCTION public.submit_public_chat_invoice(p_session_id uuid, p_student_id uuid, p_branch_id text, p_category text, p_items jsonb, p_amount numeric, p_payment_method text, p_proof_url text, p_client_ref text DEFAULT NULL)
 RETURNS TABLE(invoice_id uuid, invoice_number text, payment_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_number text;
  v_branch_country text;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_customer_unit numeric;
  v_line_total numeric;
  v_line_net numeric;
  v_line_tax numeric;
  v_discount numeric;
  v_discount_net numeric;
  v_plan text;
  v_subtotal numeric := 0;
  v_discount_total numeric := 0;
  v_net_total numeric := 0;
  v_tax_amount numeric := 0;
  v_grand_total numeric := 0;
  v_size_variant text;
  v_grading_slot_id uuid;
  v_term_id uuid;
  v_term_name text;
  v_available_credit numeric := 0;
  v_credit_used numeric := 0;
  v_remaining numeric := 0;
  v_tax_rate numeric := 0;
  v_tax_inclusive boolean := false;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  IF NULLIF(trim(COALESCE(p_client_ref, '')), '') IS NOT NULL THEN
    SELECT i.id, i.invoice_number INTO v_invoice_id, v_invoice_number
    FROM public.invoices i
    WHERE i.created_by = 'public_hello_chat'
      AND i.internal_notes LIKE '%client_ref=' || trim(p_client_ref) || ';%'
    ORDER BY i.created_at DESC
    LIMIT 1;
  END IF;

  IF v_invoice_id IS NULL AND p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    SELECT i.invoice_number INTO v_invoice_number
    FROM public.invoices i
    WHERE i.created_by = 'public_hello_chat'
      AND i.student_id = p_student_id
      AND i.created_at > now() - interval '24 hours'
      AND COALESCE(i.status, '') NOT IN ('cancelled', 'void', 'refunded')
      AND public._hello_items_fingerprint(p_items) = (
        SELECT string_agg(
                 ii.product_id::text || ':' || upper(COALESCE(ii.size_variant, '')),
                 '|' ORDER BY ii.product_id::text || ':' || upper(COALESCE(ii.size_variant, '')))
        FROM public.invoice_items ii
        WHERE ii.invoice_id = i.id AND ii.product_id IS NOT NULL
      )
    ORDER BY i.created_at DESC
    LIMIT 1;
    IF v_invoice_number IS NOT NULL THEN
      RAISE EXCEPTION 'Already submitted (%). This payment was already received; please do not pay again.', v_invoice_number
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  IF v_invoice_id IS NOT NULL THEN
    SELECT p.payment_number INTO v_payment_number
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
    ORDER BY p.created_at DESC
    LIMIT 1;
    RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
    RETURN;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No payment items provided';
  END IF;

  SELECT b.country INTO v_branch_country FROM public.branches b WHERE b.id = p_branch_id;
  v_tax_rate := CASE lower(COALESCE(v_branch_country, ''))
    WHEN 'singapore' THEN 0.09
    WHEN 'australia' THEN 0.10
    ELSE 0
  END;
  v_tax_inclusive := lower(COALESCE(v_branch_country, '')) = 'australia';

  v_invoice_number := public._next_invoice_number();
  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status, subtotal, tax_amount, discount_amount,
    total_amount, amount_paid, balance_due, issue_date, due_date, notes, internal_notes,
    created_by, updated_by
  ) VALUES (
    v_invoice_number, p_student_id, p_branch_id, 'paid', 0, 0, 0, 0, 0, 0,
    CURRENT_DATE, CURRENT_DATE, format('Public hello chat payment: %s', p_category),
    format('source=public_hello_chat; pending verification; session=%s; client_ref=%s;', p_session_id, COALESCE(NULLIF(trim(COALESCE(p_client_ref,'')),''), gen_random_uuid()::text)),
    'public_hello_chat', 'public_hello_chat'
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(COALESCE((v_item->>'qty')::integer, 1), 1);
    v_customer_unit := GREATEST(COALESCE((v_item->>'unit_price')::numeric, 0), 0);
    v_discount := GREATEST(COALESCE((v_item->>'discount')::numeric, 0), 0);
    v_plan := NULLIF(v_item->>'payment_plan', '');
    v_grading_slot_id := NULLIF(v_item->>'grading_slot_id', '')::uuid;
    v_term_id := NULLIF(v_item->>'term_id', '')::uuid;
    v_term_name := NULLIF(v_item->>'term_name', '');

    SELECT p.id, p.name, COALESCE(p.metadata, '{}'::jsonb) AS metadata INTO v_product
    FROM public.products p WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid LIMIT 1;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Invalid product in cart'; END IF;

    v_line_total := round(v_customer_unit * v_qty, 2);
    v_discount := LEAST(v_discount, v_line_total);
    IF v_tax_inclusive AND v_tax_rate > 0 THEN
      v_line_net := round(v_line_total / (1 + v_tax_rate), 2);
      v_discount_net := round(v_discount / (1 + v_tax_rate), 2);
      v_line_tax := round((v_line_total - v_discount) - ((v_line_total - v_discount) / (1 + v_tax_rate)), 2);
    ELSE
      v_line_net := v_line_total;
      v_discount_net := v_discount;
      v_line_tax := round((v_line_total - v_discount) * v_tax_rate, 2);
    END IF;

    v_subtotal := v_subtotal + v_line_net;
    v_discount_total := v_discount_total + v_discount_net;
    v_tax_amount := v_tax_amount + v_line_tax;
    v_size_variant := NULLIF(COALESCE(v_item->>'size_variant', v_item->>'size', v_item->>'variant'), '');

    INSERT INTO public.invoice_items (
      invoice_id, product_id, size_variant, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, metadata, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_product.id, v_size_variant,
      CASE WHEN v_term_name IS NOT NULL THEN v_product.name || ' — ' || v_term_name ELSE v_product.name END,
      v_qty, v_customer_unit, round(v_tax_rate * 100, 2), v_line_tax, v_line_total,
      jsonb_build_object(
        'source', 'public_hello_chat', 'customer_unit_price', v_customer_unit,
        'customer_line_total', v_line_total - v_discount,
        'grading_slot_id', v_grading_slot_id, 'term_id', v_term_id, 'term_name', v_term_name,
        'payment_plan', v_plan, 'weeks', v_qty, 'plan_discount', v_discount,
        'selected_options', COALESCE(v_item->'selected_options', '{}'::jsonb),
        'product_metadata', v_product.metadata, 'tax_inclusive', v_tax_inclusive
      ),
      'public_hello_chat', 'public_hello_chat'
    );
  END LOOP;

  v_net_total := GREATEST(round(v_subtotal - v_discount_total, 2), 0);
  IF NOT v_tax_inclusive THEN v_tax_amount := round(v_net_total * v_tax_rate, 2); END IF;
  v_grand_total := round(v_net_total + v_tax_amount, 2);

  IF abs(v_grand_total - round(p_amount, 2)) > 0.01 THEN
    RAISE EXCEPTION 'Payment total does not match invoice total';
  END IF;

  UPDATE public.invoices
  SET subtotal = v_subtotal, tax_amount = v_tax_amount, discount_amount = v_discount_total,
      total_amount = v_grand_total, amount_paid = v_grand_total, balance_due = 0,
      updated_at = now(), updated_by = 'public_hello_chat'
  WHERE id = v_invoice_id;

  PERFORM pg_advisory_xact_lock(hashtextextended('student_credit:' || p_student_id::text, 0));
  v_available_credit := GREATEST(COALESCE(public.get_student_available_credit(p_student_id), 0), 0);
  v_credit_used := round(LEAST(v_available_credit, v_grand_total), 2);
  v_remaining := round(v_grand_total - v_credit_used, 2);

  IF v_remaining > 0 AND p_payment_method NOT IN ('paynow', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF v_credit_used > 0 THEN
    INSERT INTO public.student_credits (student_id, amount, type, reference_id, description, created_by)
    VALUES (p_student_id, -v_credit_used, 'credit_hold', v_invoice_id::text,
      format('Credit on hold for Invoice #%s (pending verification)', v_invoice_number), 'public_hello_chat');

    v_payment_number := public.generate_payment_number();
    INSERT INTO public.payments (
      invoice_id, payment_number, payment_method, amount, payment_date, reference_number,
      proof_of_payment_url, notes, processed_by, is_verified, verification_status, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_payment_number, 'credit', v_credit_used, CURRENT_DATE, v_invoice_number,
      NULL, format('Student credit applied (on hold until verification); session=%s', p_session_id),
      'public_hello_chat', false, 'pending', 'public_hello_chat', 'public_hello_chat'
    );
  END IF;

  IF v_remaining > 0 THEN
    v_payment_number := public.generate_payment_number();
    INSERT INTO public.payments (
      invoice_id, payment_number, payment_method, amount, payment_date, reference_number,
      proof_of_payment_url, notes, processed_by, is_verified, verification_status, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_payment_number, p_payment_method, v_remaining, CURRENT_DATE, v_invoice_number,
      p_proof_url, format('Public hello chat payment pending verification; session=%s', p_session_id),
      'public_hello_chat', false, 'pending', 'public_hello_chat', 'public_hello_chat'
    );
  END IF;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_public_chat_invoice(uuid, uuid, text, text, jsonb, numeric, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._auto_verify_scanned_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_amount numeric;
  v_require boolean := false;
BEGIN
  IF NEW.proof_scan_status IS DISTINCT FROM 'match' OR NEW.proof_scan_amount IS NULL
     OR NEW.matched_student_id IS NULL
     OR lower(COALESCE(NEW.payment_method, '')) IN ('cash', 'credit') THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'guards_purchases' THEN
    IF COALESCE(NEW.sale_status, '') <> 'pending_verification' OR NEW.proof_url IS NULL THEN RETURN NEW; END IF;
    v_amount := NEW.total;
  ELSE
    IF COALESCE(NEW.status, '') <> 'pending_verification' THEN RETURN NEW; END IF;
    v_amount := NEW.amount;
  END IF;

  IF v_amount IS NULL OR round(NEW.proof_scan_amount * 100) <> round(v_amount * 100) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'competition_payment_submissions' THEN
    SELECT COALESCE(ev.require_grading_card, false) INTO v_require
      FROM public.competition_events ev WHERE ev.id = NEW.event_id;
    IF v_require
       AND NEW.current_belt IN ('Foundation 1','Foundation 2','Foundation 3','Foundation','White','Yellow Tip','Yellow','Green Tip','Green','Blue Tip','Blue','Red Tip','Red','Black Tip')
       AND COALESCE(array_length(NEW.grading_card_urls, 1), 0) = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'guards_purchases' THEN
    NEW.sale_status := 'verified';
  ELSE
    NEW.status := 'verified';
    NEW.reviewed_by := 'auto_scan';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verify_scan ON public.grading_payment_submissions;
CREATE TRIGGER trg_auto_verify_scan BEFORE INSERT OR UPDATE ON public.grading_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public._auto_verify_scanned_submission();
DROP TRIGGER IF EXISTS trg_auto_verify_scan ON public.competition_payment_submissions;
CREATE TRIGGER trg_auto_verify_scan BEFORE INSERT OR UPDATE ON public.competition_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public._auto_verify_scanned_submission();
DROP TRIGGER IF EXISTS trg_auto_verify_scan ON public.guards_purchases;
CREATE TRIGGER trg_auto_verify_scan BEFORE INSERT OR UPDATE ON public.guards_purchases
  FOR EACH ROW EXECUTE FUNCTION public._auto_verify_scanned_submission();

DROP TRIGGER IF EXISTS trg_auto_invoice_grading ON public.grading_payment_submissions;
CREATE TRIGGER trg_auto_invoice_grading AFTER INSERT OR UPDATE OF status, matched_student_id, matched_invoice_id, proof_scan_status
  ON public.grading_payment_submissions FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_submission();
DROP TRIGGER IF EXISTS trg_auto_invoice_competition ON public.competition_payment_submissions;
CREATE TRIGGER trg_auto_invoice_competition AFTER INSERT OR UPDATE OF status, matched_student_id, matched_invoice_id, proof_scan_status
  ON public.competition_payment_submissions FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_submission();

CREATE OR REPLACE FUNCTION public.prevent_duplicate_grading_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ref text;
BEGIN
  IF NEW.matched_student_id IS NULL OR NEW.resolved_grading_slot_id IS NULL THEN RETURN NEW; END IF;
  IF coalesce(current_setting('app.allow_duplicate_grading', true), '') = 'on' THEN RETURN NEW; END IF;
  SELECT reference_number INTO v_ref FROM public.grading_payment_submissions
   WHERE matched_student_id = NEW.matched_student_id
     AND resolved_grading_slot_id = NEW.resolved_grading_slot_id
     AND resolved_product_id IS NOT DISTINCT FROM NEW.resolved_product_id
     AND status IN ('pending_verification','verified')
     AND id <> NEW.id
   LIMIT 1;
  IF v_ref IS NULL AND NEW.resolved_product_id IS NULL AND EXISTS (SELECT 1 FROM public.grading_registrations
       WHERE student_id = NEW.matched_student_id AND grading_slot_id = NEW.resolved_grading_slot_id) THEN
    v_ref := 'existing registration';
  END IF;
  IF v_ref IS NOT NULL THEN
    RAISE EXCEPTION 'Already paid for this grading (%). Duplicate payment not accepted.', v_ref USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$;