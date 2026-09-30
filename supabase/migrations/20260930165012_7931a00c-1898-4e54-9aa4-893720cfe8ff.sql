ALTER TABLE public.competition_payment_submissions ADD COLUMN IF NOT EXISTS credit_applied numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_hello_credit_to_competition(p_session_id uuid, p_student_id uuid, p_submission_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sub record; v_avail numeric; v_used numeric; v_require boolean;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF sub.status <> 'pending_verification' OR sub.matched_invoice_id IS NOT NULL THEN RETURN COALESCE(sub.credit_applied,0); END IF;
  IF COALESCE(sub.credit_applied,0) > 0 THEN RETURN sub.credit_applied; END IF;
  IF sub.created_at < now() - interval '15 minutes' THEN RAISE EXCEPTION 'Submission too old to apply credit'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('student_credit:' || p_student_id::text, 0));
  v_avail := GREATEST(COALESCE(public.get_student_available_credit(p_student_id),0),0);
  v_used := round(LEAST(v_avail, COALESCE(sub.amount,0)), 2);

  UPDATE public.competition_payment_submissions
     SET matched_student_id = COALESCE(matched_student_id, p_student_id),
         credit_applied = v_used, updated_at = now()
   WHERE id = p_submission_id;

  IF v_used > 0 THEN
    INSERT INTO public.student_credits (student_id, amount, type, reference_id, description, created_by)
    VALUES (p_student_id, -v_used, 'credit_hold', 'comp:' || p_submission_id::text,
      format('Credit on hold for competition %s (pending verification)', sub.reference_number), 'public_hello_chat');

    IF v_used >= round(COALESCE(sub.amount,0),2) - 0.009 THEN
      SELECT coalesce(ev.require_grading_card,false) INTO v_require FROM public.competition_events ev WHERE ev.id = sub.event_id;
      IF NOT (COALESCE(v_require,false)
        AND sub.current_belt IN ('Foundation 1','Foundation 2','Foundation 3','Foundation','White','Yellow Tip','Yellow','Green Tip','Green','Blue Tip','Blue','Red Tip','Red','Black Tip')
        AND coalesce(array_length(sub.grading_card_urls,1),0) = 0) THEN
        UPDATE public.competition_payment_submissions
           SET status = 'verified', payment_method = 'credit', reviewed_by = 'credit', reviewed_at = now(), updated_at = now()
         WHERE id = p_submission_id;
      END IF;
    END IF;
  END IF;
  RETURN v_used;
END; $$;
GRANT EXECUTE ON FUNCTION public.apply_hello_credit_to_competition(uuid,uuid,uuid) TO anon, authenticated, service_role;

-- Release held credit when a competition submission is rejected or deleted
CREATE OR REPLACE FUNCTION public.trg_release_competition_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.student_credits WHERE type='credit_hold' AND reference_id = 'comp:' || OLD.id::text;
    RETURN OLD;
  END IF;
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    DELETE FROM public.student_credits WHERE type='credit_hold' AND reference_id = 'comp:' || NEW.id::text;
    NEW.credit_applied := 0;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_release_competition_credit ON public.competition_payment_submissions;
CREATE TRIGGER trg_release_competition_credit BEFORE UPDATE OR DELETE ON public.competition_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_release_competition_credit();

CREATE OR REPLACE FUNCTION public.admin_import_competition_submission(p_id uuid, p_verified_by text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  sub record; ev record; v_invoice_id uuid; v_inv_number text; v_gross_total numeric := 0;
  v_event_name text; v_main_amount numeric; v_line jsonb; v_label text; v_amount numeric;
  v_product_id uuid; v_gap numeric; v_rate numeric; v_net numeric; v_tax numeric; v_total numeric;
  v_credit numeric := 0;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT (public.has_branch_access(sub.branch_id) OR public._auto_invoice_active()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF COALESCE(sub.status,'') NOT IN ('verified','paid') THEN
    RAISE EXCEPTION 'Payment must be verified before an invoice can be created';
  END IF;
  IF sub.matched_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Submission already imported as invoice %', sub.matched_invoice_id;
  END IF;

  SELECT * INTO ev FROM public.competition_events WHERE id = sub.event_id;
  v_event_name := COALESCE(ev.name, sub.coaching_label, 'Competition Registration');
  v_product_id := COALESCE(sub.coaching_product_id, ev.coaching_product_id,
    (SELECT id FROM public.products WHERE name = 'Competition Registration' LIMIT 1));
  IF v_product_id IS NULL THEN RAISE EXCEPTION 'Competition product not configured'; END IF;

  v_rate := public.gst_rate_for_branch(sub.branch_id);
  SELECT r.net, r.tax, r.total INTO v_net, v_tax, v_total
  FROM public.resolve_public_amount(sub.branch_id, COALESCE(sub.amount, 0), sub.amount_net, sub.gst_amount, NULL) r;

  v_inv_number := public._next_invoice_number();
  INSERT INTO public.invoices (invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by)
  VALUES (v_inv_number, sub.matched_student_id, sub.branch_id, 'paid', 0,0,0,0,0,0,
    CURRENT_DATE, CURRENT_DATE, 'Imported from public competition submission ' || sub.reference_number,
    p_verified_by, p_verified_by) RETURNING id INTO v_invoice_id;

  v_main_amount := COALESCE(sub.coaching_amount, 0);
  IF v_main_amount > 0 THEN
    INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by)
    VALUES (v_invoice_id, v_product_id, v_event_name, 1, v_main_amount, round(v_rate * 100, 2), 0, v_main_amount, p_verified_by, p_verified_by);
    v_gross_total := v_gross_total + v_main_amount;
  END IF;

  IF jsonb_typeof(COALESCE(sub.extra_lines, '[]'::jsonb)) = 'array' THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(sub.extra_lines) LOOP
      v_label := NULLIF(btrim(coalesce(v_line->>'label','')),'');
      v_amount := COALESCE(NULLIF(v_line->>'amount','')::numeric, 0);
      IF v_amount > 0 OR v_label IS NOT NULL THEN
        INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by)
        VALUES (v_invoice_id, v_product_id, v_event_name || COALESCE(' - ' || v_label, ''), 1, v_amount, round(v_rate * 100, 2), 0, v_amount, p_verified_by, p_verified_by);
        v_gross_total := v_gross_total + v_amount;
      END IF;
    END LOOP;
  END IF;

  v_gap := round(COALESCE(sub.amount, 0) - v_gross_total, 2);
  IF v_gap > 0 THEN
    INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by)
    VALUES (v_invoice_id, v_product_id, v_event_name, 1, v_gap, round(v_rate * 100, 2), 0, v_gap, p_verified_by, p_verified_by);
    v_gross_total := v_gross_total + v_gap;
  END IF;

  IF abs(v_gross_total - v_total) >= 0.01 THEN
    SELECT r.net, r.tax, r.total INTO v_net, v_tax, v_total
    FROM public.resolve_public_amount(sub.branch_id, v_gross_total, NULL, NULL, NULL) r;
  END IF;

  UPDATE public.invoices SET subtotal = v_net, tax_amount = v_tax, total_amount = v_total,
      amount_paid = v_total, balance_due = 0 WHERE id = v_invoice_id;

  -- Credit held from /hello: convert hold to applied and record as a credit payment
  SELECT COALESCE(-SUM(amount),0) INTO v_credit FROM public.student_credits
   WHERE type='credit_hold' AND reference_id = 'comp:' || p_id::text;
  v_credit := LEAST(GREATEST(v_credit,0), v_total);
  IF v_credit > 0 THEN
    UPDATE public.student_credits
       SET type = 'credit_applied', reference_id = v_invoice_id::text,
           description = format('Credit applied to Invoice #%s (competition %s)', v_inv_number, sub.reference_number)
     WHERE type='credit_hold' AND reference_id = 'comp:' || p_id::text;
    INSERT INTO public.payments (invoice_id, payment_method, amount, payment_date, reference_number,
      notes, processed_by, created_by, updated_by, is_verified, verified_by, verified_at, verification_status)
    VALUES (v_invoice_id, 'credit', v_credit, CURRENT_DATE, sub.reference_number,
      'Student credit applied (competition)', p_verified_by, p_verified_by, p_verified_by,
      true, p_verified_by, now(), 'verified');
  END IF;

  IF round(v_total - v_credit, 2) > 0 THEN
    INSERT INTO public.payments (invoice_id, payment_method, amount, payment_date, reference_number,
      proof_of_payment_url, notes, processed_by, created_by, updated_by,
      is_verified, verified_by, verified_at, verification_status)
    VALUES (v_invoice_id, sub.payment_method, round(v_total - v_credit, 2), CURRENT_DATE, sub.reference_number,
      sub.proof_url, 'Imported from public competition submission', p_verified_by, p_verified_by, p_verified_by,
      true, p_verified_by, now(), 'verified');
  END IF;

  IF sub.certificate_url IS NOT NULL THEN
    UPDATE public.students SET certificate_name = COALESCE(NULLIF(btrim(certificate_name),''), sub.certificate_url)
    WHERE id = sub.matched_student_id;
  END IF;

  UPDATE public.competition_payment_submissions
  SET status = 'verified', matched_invoice_id = v_invoice_id,
      amount_net = COALESCE(amount_net, v_net), gst_amount = COALESCE(gst_amount, v_tax),
      reviewed_by = p_verified_by, reviewed_at = now(), updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$function$;