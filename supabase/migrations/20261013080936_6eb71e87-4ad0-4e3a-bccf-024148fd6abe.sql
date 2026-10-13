CREATE OR REPLACE FUNCTION public.create_access_invoice(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid := NULLIF(p_payload->>'student_id','')::uuid;
  v_branch_id text := NULLIF(p_payload->>'branch_id','');
  v_notes text := NULLIF(p_payload->>'notes','');
  v_terms int := COALESCE(NULLIF(p_payload->>'payment_terms_days','')::int, 30);
  v_actor text := COALESCE(NULLIF(p_payload->>'actor',''), 'access');
  v_issue date := COALESCE(NULLIF(p_payload->>'issue_date','')::date, current_date);
  v_due date;
  v_country text;
  v_tax_rate numeric;
  v_tax_included boolean;
  v_item jsonb;
  v_price numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item_id uuid;
  v_product record;
  v_term_id uuid;
  v_term record;
  v_sessions int;
  v_valid_from date;
  v_valid_to date;
  v_slots jsonb;
  v_slot text;
  v_tt_id uuid;
  v_tt_date date;
  v_tt record;
  v_enrollment_id uuid;
  v_credit numeric := COALESCE(NULLIF(p_payload->>'credit_to_apply','')::numeric, 0);
  v_available numeric;
  v_apply numeric;
  v_payment jsonb := p_payload->'payment';
  v_pay_amount numeric;
BEGIN
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Student is required'; END IF;
  IF v_branch_id IS NULL THEN RAISE EXCEPTION 'Branch is required'; END IF;
  IF p_payload->'items' IS NULL OR jsonb_array_length(p_payload->'items') = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id) THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  SELECT country INTO v_country FROM public.branches WHERE id = v_branch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Branch not found'; END IF;

  v_tax_rate := CASE v_country WHEN 'Singapore' THEN 0.09 WHEN 'Australia' THEN 0.10 ELSE 0 END;
  v_tax_included := CASE
    WHEN p_payload ? 'tax_included' AND p_payload->>'tax_included' IS NOT NULL THEN (p_payload->>'tax_included')::boolean
    WHEN v_country = 'Australia' THEN true
    ELSE false END;
  v_due := v_issue + v_terms;

  -- Totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    v_price := COALESCE(NULLIF(v_item->>'total_override','')::numeric,
      COALESCE(NULLIF(v_item->>'quantity','')::numeric,1) * COALESCE(NULLIF(v_item->>'unit_price','')::numeric,0));
    IF v_tax_included THEN
      v_subtotal := v_subtotal + v_price / (1 + v_tax_rate);
      v_tax := v_tax + v_price - v_price / (1 + v_tax_rate);
    ELSE
      v_subtotal := v_subtotal + v_price;
      v_tax := v_tax + v_price * v_tax_rate;
    END IF;
  END LOOP;
  v_total := v_subtotal + v_tax;

  v_invoice_number := public._next_invoice_number();

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, subtotal, tax_amount, discount_amount,
    total_amount, amount_paid, balance_due, status, issue_date, due_date,
    payment_terms_days, notes, internal_notes, created_by
  ) VALUES (
    v_invoice_number, v_student_id, v_branch_id, v_subtotal, v_tax, 0,
    v_total, 0, v_total,
    CASE WHEN v_total <= 0 THEN 'verified' ELSE 'draft' END,
    v_issue, v_due, v_terms, v_notes,
    CASE WHEN v_total <= 0 THEN 'Sponsored — 100% discount, no payment required' END,
    'access_portal'
  ) RETURNING id INTO v_invoice_id;

  -- Line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    v_price := COALESCE(NULLIF(v_item->>'total_override','')::numeric,
      COALESCE(NULLIF(v_item->>'quantity','')::numeric,1) * COALESCE(NULLIF(v_item->>'unit_price','')::numeric,0));
    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, size_variant, metadata, created_by
    ) VALUES (
      v_invoice_id,
      NULLIF(v_item->>'product_id','')::uuid,
      v_item->>'description',
      COALESCE(NULLIF(v_item->>'quantity','')::numeric,1),
      COALESCE(NULLIF(v_item->>'unit_price','')::numeric,0),
      v_tax_rate,
      CASE WHEN v_tax_included THEN v_price - v_price/(1+v_tax_rate) ELSE v_price * v_tax_rate END,
      CASE WHEN v_tax_included THEN v_price ELSE v_price * (1+v_tax_rate) END,
      NULLIF(v_item->>'size_variant',''),
      v_item->'metadata',
      'access_portal'
    ) RETURNING id INTO v_item_id;

    -- Entitlement for lesson products (mirrors the staff createInvoice flow)
    IF NULLIF(v_item->>'product_id','') IS NOT NULL THEN
      SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
      IF FOUND AND COALESCE(v_product.is_lesson,false) THEN
        v_sessions := CASE WHEN COALESCE(v_product.session_count,0) > 0
          THEN v_product.session_count * COALESCE(NULLIF(v_item->>'quantity','')::int,1)
          ELSE COALESCE(NULLIF(v_item->>'quantity','')::int,1) END;
        v_valid_from := current_date;
        v_valid_to := NULL;
        BEGIN v_term_id := NULLIF(v_item->'metadata'->>'term_id','')::uuid; EXCEPTION WHEN others THEN v_term_id := NULL; END;
        IF v_term_id IS NULL THEN v_term_id := v_product.term_id; END IF;
        IF v_term_id IS NOT NULL THEN
          SELECT start_date, end_date INTO v_term FROM public.term_calendars WHERE id = v_term_id;
          IF FOUND THEN
            v_valid_from := COALESCE(v_term.start_date, v_valid_from);
            v_valid_to := v_term.end_date;
          END IF;
        ELSIF v_product.validity_type = 'months' AND v_product.validity_months IS NOT NULL THEN
          v_valid_to := (current_date + (v_product.validity_months || ' months')::interval)::date;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.entitlements WHERE source_type='invoice_item' AND source_id = v_item_id) THEN
          INSERT INTO public.entitlements (
            student_id, product_id, source_type, source_id, sessions_total, sessions_used,
            is_active, valid_from, valid_to, branch_scope, class_type_scope, notes
          ) VALUES (
            v_student_id, v_product.id, 'invoice_item', v_item_id, v_sessions, 0,
            true, v_valid_from, v_valid_to, v_branch_id,
            array_to_string(v_product.allowed_class_types, ','),
            'Auto-created from invoice ' || v_invoice_number
          );
        END IF;
      END IF;

      -- Enrollment + scheduled classes for items with selected class slots
      v_slots := v_item->'metadata'->'selected_class_slots';
      IF v_slots IS NOT NULL AND jsonb_typeof(v_slots) = 'array' AND jsonb_array_length(v_slots) > 0 AND v_term_id IS NOT NULL THEN
        INSERT INTO public.student_class_enrollments (
          student_id, term_id, branch_id, class_type, tier_name, total_price, invoice_item_id, status, created_by
        ) VALUES (
          v_student_id, v_term_id, v_branch_id,
          COALESCE(v_product.name, 'Class'), COALESCE(v_product.name, 'Class'),
          COALESCE(NULLIF(v_item->>'quantity','')::numeric,1) * COALESCE(NULLIF(v_item->>'unit_price','')::numeric,0),
          v_item_id, 'active', v_actor
        ) RETURNING id INTO v_enrollment_id;

        FOREACH v_slot IN ARRAY ARRAY(SELECT jsonb_array_elements_text(v_slots)) LOOP
          v_tt_id := NULLIF(split_part(v_slot, '_', 1),'')::uuid;
          v_tt_date := NULLIF(split_part(v_slot, '_', 2),'')::date;
          IF v_tt_id IS NOT NULL AND v_tt_date IS NOT NULL THEN
            SELECT id, start_time, end_time, class_type INTO v_tt FROM public.branch_timetables WHERE id = v_tt_id;
            IF FOUND THEN
              UPDATE public.student_class_enrollments SET class_type = v_tt.class_type WHERE id = v_enrollment_id AND v_tt.class_type IS NOT NULL;
              INSERT INTO public.student_scheduled_classes (
                enrollment_id, timetable_id, scheduled_date, start_time, end_time, status
              ) VALUES (v_enrollment_id, v_tt_id, v_tt_date, v_tt.start_time, v_tt.end_time, 'scheduled');
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- Apply student credit first (same as the staff dialog)
  IF v_credit > 0 THEN
    v_available := COALESCE(public.get_student_available_credit(v_student_id), 0);
    v_apply := LEAST(v_credit, v_available, v_total);
    IF v_apply > 0 THEN
      INSERT INTO public.student_credits (student_id, amount, type, reference_id, description, created_by)
      VALUES (v_student_id, -v_apply, 'credit_applied', v_invoice_id,
        'Credit applied to Invoice #' || v_invoice_number, v_actor);
      INSERT INTO public.payments (invoice_id, amount, payment_date, payment_method, notes, created_by)
      VALUES (v_invoice_id, v_apply, current_date, 'bank_transfer',
        'Auto-applied from student credit balance', v_actor);
    END IF;
  END IF;

  -- Optional payment recorded in the same step
  IF v_payment IS NOT NULL THEN
    v_pay_amount := COALESCE(NULLIF(v_payment->>'amount','')::numeric, 0);
    IF v_pay_amount > 0 THEN
      INSERT INTO public.payments (
        invoice_id, amount, payment_date, payment_method, reference_number, proof_of_payment_url, created_by
      ) VALUES (
        v_invoice_id, v_pay_amount,
        COALESCE(NULLIF(v_payment->>'payment_date','')::date, current_date),
        COALESCE(NULLIF(v_payment->>'payment_method',''), 'paynow'),
        NULLIF(v_payment->>'reference_number',''),
        NULLIF(v_payment->>'proof_of_payment_url',''),
        v_actor
      );
    END IF;
  END IF;

  INSERT INTO public.invoice_change_logs (invoice_id, action, changes, changed_by)
  VALUES (v_invoice_id, 'created', jsonb_build_object(
    'invoice_number', v_invoice_number, 'student_id', v_student_id,
    'total_amount', v_total, 'source', 'access_portal'), v_actor);

  RETURN jsonb_build_object('invoice_id', v_invoice_id, 'invoice_number', v_invoice_number, 'total_amount', v_total);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_access_invoice(jsonb) TO anon, authenticated, service_role;