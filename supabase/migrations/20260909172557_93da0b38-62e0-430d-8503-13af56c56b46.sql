-- 1. Expose lessons_per_week to the public chat product list
CREATE OR REPLACE FUNCTION public.get_public_chat_products_for_student(
  p_session_id uuid, p_student_id uuid, p_branch_id text, p_category_id uuid
)
RETURNS TABLE (
  product_id uuid, product_name text, base_price numeric, branch_price numeric,
  requires_size boolean, available_sizes text[], available_variants jsonb,
  metadata jsonb, is_term_based boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_current_belt text;
  v_school_fee_category uuid := 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid;
  v_uniform_category uuid := 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c'::uuid;
  v_protection_category uuid := '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN;
  END IF;

  SELECT s.current_belt INTO v_current_belt
  FROM public.students s
  WHERE s.id = p_student_id;

  RETURN QUERY
  SELECT
    x.product_id,
    x.product_name,
    x.base_price,
    x.branch_price,
    x.requires_size,
    x.available_sizes,
    x.available_variants,
    x.metadata,
    x.is_term_based
  FROM (
    SELECT DISTINCT ON (p.id)
      p.id AS product_id,
      p.name AS product_name,
      p.base_price,
      COALESCE(pr.price_override, p.base_price) AS branch_price,
      COALESCE(p.requires_size, false) AS requires_size,
      p.available_sizes,
      COALESCE(p.available_variants, '{}'::jsonb) AS available_variants,
      COALESCE(p.metadata, '{}'::jsonb)
        || jsonb_build_object(
             'lessons_per_week', p.lessons_per_week,
             'lesson_days', p.lesson_days
           ) AS metadata,
      (p.category_id = v_school_fee_category
        AND COALESCE(p.is_lesson, false) = true
        AND COALESCE(p.is_adhoc_lesson, false) = false) AS is_term_based,
      EXISTS (
        SELECT 1
        FROM public.invoice_items ii
        JOIN public.invoices i ON i.id = ii.invoice_id
        WHERE ii.product_id = p.id
          AND i.student_id = p_student_id
          AND i.branch_id = p_branch_id
      ) AS previously_billed,
      pr.price_override AS sort_price_override,
      pr.updated_at AS sort_rule_updated
    FROM public.products p
    LEFT JOIN public.price_rules pr
      ON pr.product_id = p.id
     AND pr.branch_id = p_branch_id
     AND COALESCE(pr.is_active, true) = true
     AND (pr.effective_from IS NULL OR pr.effective_from <= current_date)
     AND (pr.effective_to IS NULL OR pr.effective_to >= current_date)
    WHERE COALESCE(p.is_active, true) = true
      AND p.category_id = p_category_id
      AND (
        (p_category_id = v_school_fee_category AND (
          EXISTS (
            SELECT 1
            FROM public.invoice_items ii
            JOIN public.invoices i ON i.id = ii.invoice_id
            WHERE ii.product_id = p.id
              AND i.student_id = p_student_id
              AND i.branch_id = p_branch_id
          )
          OR (
            p.name NOT IN ('Trial Lesson', 'Ad-Hoc Lesson', 'Private Lesson')
            AND EXISTS (
              SELECT 1
              FROM public.price_rules pr2
              WHERE pr2.product_id = p.id
                AND pr2.branch_id = p_branch_id
                AND pr2.is_active = true
                AND (pr2.effective_from IS NULL OR pr2.effective_from <= current_date)
                AND (pr2.effective_to IS NULL OR pr2.effective_to >= current_date)
            )
            AND (
              p.allowed_belt_levels IS NULL
              OR v_current_belt IS NULL
              OR p.allowed_belt_levels @> ARRAY[v_current_belt]::text[]
            )
          )
        ))
        OR (p_category_id = v_uniform_category
          AND v_current_belt IS NOT NULL
          AND p.allowed_belt_levels IS NOT NULL
          AND p.allowed_belt_levels @> ARRAY[v_current_belt]::text[]
        )
        OR (p_category_id = v_protection_category)
        OR (p_category_id NOT IN (v_school_fee_category, v_uniform_category, v_protection_category))
      )
    ORDER BY p.id, pr.price_override NULLS LAST, pr.updated_at DESC NULLS LAST
  ) x
  ORDER BY x.previously_billed DESC, (x.product_name ILIKE 'Gaonhae %') DESC, x.product_name ASC;
END;
$fn$;

-- 2. Save the lessons planned in the chat, awaiting payment verification
CREATE OR REPLACE FUNCTION public.attach_public_chat_planned_schedule(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text,
  p_invoice_id uuid,
  p_term_id uuid,
  p_product_id uuid,
  p_slots jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_term record;
  v_product record;
  v_enrollment_id uuid;
  v_slot jsonb;
  v_date date;
  v_start time;
  v_end time;
  v_timetable_id uuid;
  v_cap integer;
  v_booked integer;
  v_inserted integer := 0;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) = 0 THEN
    RETURN 0;
  END IF;

  SELECT t.id, t.start_date, t.end_date, t.name
    INTO v_term
  FROM public.term_calendars t
  WHERE t.id = p_term_id AND t.branch_id = p_branch_id;
  IF v_term.id IS NULL THEN
    RAISE EXCEPTION 'Term not found for branch';
  END IF;

  SELECT p.id, p.name, COALESCE(p.class_type, p.name) AS class_type
    INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Class product not found';
  END IF;

  SELECT e.id INTO v_enrollment_id
  FROM public.student_class_enrollments e
  WHERE e.student_id = p_student_id
    AND e.term_id = p_term_id
    AND e.branch_id = p_branch_id
    AND e.status = 'active'
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    INSERT INTO public.student_class_enrollments (
      student_id, term_id, branch_id, class_type, tier_name,
      total_price, status, notes, created_by, updated_by
    ) VALUES (
      p_student_id, p_term_id, p_branch_id,
      COALESCE(v_product.class_type, v_product.name), v_product.name,
      0, 'active',
      format('source=public_hello_chat; pending payment verification; invoice=%s', p_invoice_id),
      'public_hello_chat', 'public_hello_chat'
    ) RETURNING id INTO v_enrollment_id;
  END IF;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    v_date := (v_slot->>'date')::date;
    v_start := (v_slot->>'start_time')::time;
    v_end := (v_slot->>'end_time')::time;
    v_timetable_id := NULLIF(v_slot->>'timetable_id', '')::uuid;

    CONTINUE WHEN v_date IS NULL OR v_start IS NULL OR v_end IS NULL;
    CONTINUE WHEN v_date < v_term.start_date OR v_date > v_term.end_date;

    -- skip duplicates for this student
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.student_scheduled_classes sc
      JOIN public.student_class_enrollments e ON e.id = sc.enrollment_id
      WHERE e.student_id = p_student_id
        AND sc.scheduled_date = v_date
        AND sc.start_time = v_start
        AND sc.status NOT IN ('cancelled','swapped')
    );

    IF v_timetable_id IS NOT NULL THEN
      SELECT COALESCE(bt.max_capacity, 999) INTO v_cap
      FROM public.branch_timetables bt WHERE bt.id = v_timetable_id;

      SELECT COUNT(*) INTO v_booked
      FROM public.student_scheduled_classes sc
      WHERE sc.timetable_id = v_timetable_id
        AND sc.scheduled_date = v_date
        AND sc.status NOT IN ('cancelled','swapped');

      CONTINUE WHEN v_booked >= COALESCE(v_cap, 999);
    END IF;

    INSERT INTO public.student_scheduled_classes (
      enrollment_id, timetable_id, scheduled_date, start_time, end_time, status, notes
    ) VALUES (
      v_enrollment_id, v_timetable_id, v_date, v_start, v_end, 'scheduled',
      format('pending_payment_verification; invoice=%s', p_invoice_id)
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$fn$;

REVOKE ALL ON FUNCTION public.attach_public_chat_planned_schedule(uuid, uuid, text, uuid, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_public_chat_planned_schedule(uuid, uuid, text, uuid, uuid, uuid, jsonb) TO anon, authenticated, service_role;

-- 3. Clear / cancel the flagged lessons on verify / reject
CREATE OR REPLACE FUNCTION public.admin_verify_school_fees_submission(p_id uuid, p_verified_by text DEFAULT 'admin'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;

  v_invoice_id := public._resolve_chat_submission_invoice(sub);

  UPDATE public.public_chat_payment_submissions
     SET status = 'verified',
         notes = COALESCE(notes, '') || format(E'\nVerified by %s at %s', p_verified_by, now())
   WHERE id = p_id;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.payments
       SET is_verified = true,
           verification_status = 'verified',
           verified_at = now(),
           updated_at = now(),
           updated_by = p_verified_by
     WHERE invoice_id = v_invoice_id;

    UPDATE public.invoices
       SET status = 'verified',
           updated_at = now(),
           updated_by = p_verified_by
     WHERE id = v_invoice_id;

    UPDATE public.student_scheduled_classes
       SET notes = NULL, updated_at = now()
     WHERE notes = format('pending_payment_verification; invoice=%s', v_invoice_id);
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_reject_school_fees_submission(p_id uuid, p_reason text DEFAULT NULL::text, p_reviewed_by text DEFAULT 'admin'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;

  v_invoice_id := public._resolve_chat_submission_invoice(sub);

  UPDATE public.public_chat_payment_submissions
     SET status = 'rejected',
         notes = COALESCE(p_reason, notes)
   WHERE id = p_id;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.payments
       SET is_verified = false,
           verification_status = 'rejected',
           notes = COALESCE(notes, '') || format(E'\nRejected by %s: %s', p_reviewed_by, COALESCE(p_reason, 'no reason given')),
           updated_at = now(),
           updated_by = p_reviewed_by
     WHERE invoice_id = v_invoice_id;

    UPDATE public.invoices
       SET status = 'unpaid',
           amount_paid = 0,
           balance_due = total_amount,
           updated_at = now(),
           updated_by = p_reviewed_by
     WHERE id = v_invoice_id;

    UPDATE public.student_scheduled_classes
       SET status = 'cancelled', updated_at = now()
     WHERE notes = format('pending_payment_verification; invoice=%s', v_invoice_id)
       AND status NOT IN ('attended','cancelled');
  END IF;
END;
$fn$;