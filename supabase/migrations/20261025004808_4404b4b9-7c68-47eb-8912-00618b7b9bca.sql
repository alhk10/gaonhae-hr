-- ===== New attendance tables =====
CREATE TABLE public.lesson_class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_id text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lesson_class_types_name_branch ON public.lesson_class_types (lower(name), coalesce(branch_id,''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_class_types TO authenticated;
GRANT ALL ON public.lesson_class_types TO service_role;
ALTER TABLE public.lesson_class_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_class_types_read ON public.lesson_class_types FOR SELECT TO authenticated USING (true);
CREATE POLICY lesson_class_types_superadmin ON public.lesson_class_types FOR ALL TO authenticated
  USING (get_current_user_role() = 'superadmin') WITH CHECK (get_current_user_role() = 'superadmin');
CREATE TRIGGER trg_lesson_class_types_updated BEFORE UPDATE ON public.lesson_class_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.lesson_class_types (name)
SELECT DISTINCT trim(class_type) FROM public.branch_timetables WHERE coalesce(trim(class_type),'') <> ''
ON CONFLICT DO NOTHING;

CREATE TABLE public.lesson_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  branch_id text NOT NULL,
  timetable_id uuid REFERENCES public.branch_timetables(id) ON DELETE SET NULL,
  lesson_date date NOT NULL,
  start_time time,
  end_time time,
  class_type text,
  term_id uuid REFERENCES public.term_calendars(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'booked',
  source text NOT NULL DEFAULT 'staff',
  cancel_requested boolean NOT NULL DEFAULT false,
  invoice_id uuid,
  entitlement_id uuid REFERENCES public.entitlements(id) ON DELETE SET NULL,
  notes text,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  marked_by text,
  marked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lesson_bookings_unique_slot ON public.lesson_bookings (student_id, lesson_date, timetable_id) WHERE status <> 'rejected';
CREATE INDEX lesson_bookings_branch_date ON public.lesson_bookings (branch_id, lesson_date);
CREATE INDEX lesson_bookings_student ON public.lesson_bookings (student_id, lesson_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_bookings TO authenticated;
GRANT ALL ON public.lesson_bookings TO service_role;
ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_bookings_superadmin ON public.lesson_bookings FOR ALL TO authenticated
  USING (get_current_user_role() = 'superadmin') WITH CHECK (get_current_user_role() = 'superadmin');
CREATE POLICY lesson_bookings_sales_read ON public.lesson_bookings FOR SELECT TO authenticated
  USING (has_sales_access());
CREATE POLICY lesson_bookings_student_read ON public.lesson_bookings FOR SELECT TO authenticated
  USING (student_id IN (SELECT s.id FROM public.students s WHERE s.email = auth.email()));

CREATE OR REPLACE FUNCTION public._lesson_bookings_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('requested','booked','attended','absent','rejected') THEN
    RAISE EXCEPTION 'Invalid lesson booking status %', NEW.status;
  END IF;
  IF NEW.term_id IS NULL THEN
    SELECT t.id INTO NEW.term_id FROM public.term_calendars t
     WHERE t.branch_id = NEW.branch_id AND NEW.lesson_date BETWEEN t.start_date AND t.end_date
     ORDER BY t.start_date DESC LIMIT 1;
  END IF;
  IF NEW.timetable_id IS NOT NULL AND (NEW.start_time IS NULL OR NEW.class_type IS NULL) THEN
    SELECT coalesce(NEW.start_time, bt.start_time), coalesce(NEW.end_time, bt.end_time), coalesce(NEW.class_type, bt.class_type)
      INTO NEW.start_time, NEW.end_time, NEW.class_type
      FROM public.branch_timetables bt WHERE bt.id = NEW.timetable_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_lesson_bookings_validate BEFORE INSERT OR UPDATE ON public.lesson_bookings
  FOR EACH ROW EXECUTE FUNCTION public._lesson_bookings_validate();

CREATE OR REPLACE FUNCTION public._lesson_bookings_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_was boolean := false; v_is boolean := false; v_ent uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_was := OLD.status IN ('attended','absent'); END IF;
  IF TG_OP <> 'DELETE' THEN v_is := NEW.status IN ('attended','absent'); END IF;

  IF v_was AND (NOT v_is OR TG_OP = 'DELETE') THEN
    IF OLD.entitlement_id IS NOT NULL THEN
      UPDATE public.entitlements SET sessions_used = GREATEST(0, coalesce(sessions_used,0) - 1), updated_at = now()
       WHERE id = OLD.entitlement_id;
    END IF;
    IF TG_OP = 'UPDATE' THEN NEW.entitlement_id := NULL; END IF;
  END IF;

  IF v_is AND NOT v_was THEN
    SELECT e.id INTO v_ent FROM public.entitlements e
     WHERE e.student_id = NEW.student_id AND e.is_active
       AND (e.valid_from IS NULL OR e.valid_from <= NEW.lesson_date)
       AND (e.valid_to IS NULL OR e.valid_to >= NEW.lesson_date)
       AND (e.branch_scope IS NULL OR e.branch_scope = '' OR e.branch_scope = NEW.branch_id)
       AND (e.sessions_total IS NULL OR coalesce(e.sessions_used,0) < e.sessions_total)
     ORDER BY e.valid_to NULLS LAST, e.created_at
     LIMIT 1;
    IF v_ent IS NOT NULL THEN
      UPDATE public.entitlements SET sessions_used = coalesce(sessions_used,0) + 1, updated_at = now() WHERE id = v_ent;
    END IF;
    NEW.entitlement_id := v_ent;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_lesson_bookings_entitlement BEFORE INSERT OR UPDATE OF status OR DELETE ON public.lesson_bookings
  FOR EACH ROW EXECUTE FUNCTION public._lesson_bookings_entitlement();

CREATE OR REPLACE FUNCTION public._lesson_balance(p_student_id uuid, p_branch_id text, p_from date, p_to date)
RETURNS TABLE(remaining integer, pending integer, unlimited boolean, available integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rem integer; v_pend integer; v_unl boolean;
BEGIN
  SELECT coalesce(sum(GREATEST(0, e.sessions_total - coalesce(e.sessions_used,0))) FILTER (WHERE e.sessions_total IS NOT NULL),0)::int,
         bool_or(e.sessions_total IS NULL OR p.name ILIKE '%unlimited%')
    INTO v_rem, v_unl
    FROM public.entitlements e LEFT JOIN public.products p ON p.id = e.product_id
   WHERE e.student_id = p_student_id AND e.is_active
     AND (e.valid_from IS NULL OR e.valid_from <= p_to)
     AND (e.valid_to IS NULL OR e.valid_to >= p_from)
     AND (e.branch_scope IS NULL OR e.branch_scope = '' OR e.branch_scope = p_branch_id);
  SELECT count(*)::int INTO v_pend FROM public.lesson_bookings lb
   WHERE lb.student_id = p_student_id AND lb.status IN ('requested','booked')
     AND lb.lesson_date BETWEEN p_from AND p_to;
  RETURN QUERY SELECT v_rem, v_pend, coalesce(v_unl,false),
    CASE WHEN coalesce(v_unl,false) THEN 999 ELSE GREATEST(0, v_rem - v_pend) END;
END $$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.get_public_student_term_context(uuid,uuid,uuid)'::regprocedure);
  o := d;
  d := replace(d, $q$      SELECT e.id, e.class_type INTO v_enrollment_id, v_class_type
        FROM student_class_enrollments e
        WHERE e.student_id = p_student_id AND e.term_id = p_term_id AND e.status = 'active'
        LIMIT 1;$q$, $r$      v_enrollment_id := NULL; v_class_type := NULL;$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: ctx3 a'; END IF;
  o := d;
  d := regexp_replace(d, $q$  IF v_enrollment_id IS NOT NULL THEN\n    SELECT COUNT\(\*\) INTO v_active.*?END IF;\n$q$, $r$  SELECT COUNT(*) INTO v_active FROM lesson_bookings lb
   WHERE lb.student_id = p_student_id AND lb.status IN ('requested','booked')
     AND lb.lesson_date BETWEEN v_term.start_date AND v_term.end_date;
$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: ctx3 b'; END IF;
  o := d;
  d := regexp_replace(d, $q$  SELECT\n    COUNT\(\*\) FILTER .*?AND ca\.class_date BETWEEN v_month_start AND v_month_end;$q$, $r$  SELECT COUNT(*) FILTER (WHERE lb.status='attended'), COUNT(*) FILTER (WHERE lb.status='absent')
    INTO v_attended, v_missed FROM lesson_bookings lb
   WHERE lb.student_id = p_student_id AND lb.lesson_date BETWEEN v_month_start AND v_month_end;$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: ctx3 c'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.get_public_student_term_context(uuid,uuid)'::regprocedure);
  o := d;
  d := regexp_replace(d, $q$  IF v_term\.enrollment_id IS NOT NULL THEN\n    SELECT COUNT\(\*\) INTO v_active.*?END IF;\n$q$, $r$  SELECT COUNT(*) INTO v_active FROM lesson_bookings lb
   WHERE lb.student_id = p_student_id AND lb.status IN ('requested','booked')
     AND lb.lesson_date BETWEEN v_term.start_date AND v_term.end_date;
$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: ctx2 a'; END IF;
  o := d;
  d := regexp_replace(d, $q$  SELECT\n    COUNT\(\*\) FILTER .*?AND ca\.class_date BETWEEN v_month_start AND v_month_end;$q$, $r$  SELECT COUNT(*) FILTER (WHERE lb.status='attended'), COUNT(*) FILTER (WHERE lb.status='absent')
    INTO v_attended, v_missed FROM lesson_bookings lb
   WHERE lb.student_id = p_student_id AND lb.lesson_date BETWEEN v_month_start AND v_month_end;$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: ctx2 b'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public._resolve_public_student_term(uuid)'::regprocedure);
  o := d;
  d := regexp_replace(d, $q$  RETURN QUERY\n  SELECT t\.id, e\.id.*?IF FOUND THEN RETURN; END IF;\n\n$q$, $r$$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: resolve'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.create_access_invoice(jsonb)'::regprocedure);
  o := d;
  d := regexp_replace(d, $q$        INSERT INTO public\.student_class_enrollments \(.*?RETURNING id INTO v_enrollment_id;\n$q$, $r$$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: cai a'; END IF;
  o := d;
  d := replace(d, $q$              UPDATE public.student_class_enrollments SET class_type = v_tt.class_type WHERE id = v_enrollment_id AND v_tt.class_type IS NOT NULL;
              INSERT INTO public.student_scheduled_classes (
                enrollment_id, timetable_id, scheduled_date, start_time, end_time, status
              ) VALUES (v_enrollment_id, v_tt_id, v_tt_date, v_tt.start_time, v_tt.end_time, 'scheduled');$q$, $r$              INSERT INTO public.lesson_bookings (student_id, branch_id, timetable_id, lesson_date, start_time, end_time, class_type, term_id, status, source, invoice_id, created_by)
              VALUES (v_student_id, v_branch_id, v_tt_id, v_tt_date, v_tt.start_time, v_tt.end_time, v_tt.class_type, v_term_id, 'booked', 'invoice', v_invoice_id, v_actor)
              ON CONFLICT DO NOTHING;$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: cai b'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.admin_verify_school_fees_submission(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, $q$    UPDATE public.student_scheduled_classes
       SET notes = NULL, updated_at = now()
     WHERE notes = format('pending_payment_verification; invoice=%s', v_invoice_id);$q$, $r$    UPDATE public.lesson_bookings SET status = 'booked', approved_by = p_verified_by, approved_at = now()
     WHERE invoice_id = v_invoice_id AND status = 'requested';$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: verify sf'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.admin_reject_school_fees_submission(uuid,text,text)'::regprocedure);
  o := d;
  d := replace(d, $q$    UPDATE public.student_scheduled_classes
       SET status = 'cancelled', updated_at = now()
     WHERE notes = format('pending_payment_verification; invoice=%s', v_invoice_id)
       AND status NOT IN ('attended','cancelled');$q$, $r$    UPDATE public.lesson_bookings SET status = 'rejected', updated_at = now()
     WHERE invoice_id = v_invoice_id AND status = 'requested';$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: reject sf'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.admin_correct_submission_match(uuid,uuid,text)'::regprocedure);
  o := d;
  d := replace(d, $q$    UPDATE public.student_class_enrollments e SET student_id = p_new_student_id, updated_at = now()
      FROM public.invoice_items ii WHERE e.invoice_item_id = ii.id AND ii.invoice_id = v_invoice_id;$q$, $r$    UPDATE public.lesson_bookings lb SET student_id = p_new_student_id, updated_at = now()
      WHERE lb.invoice_id = v_invoice_id;$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: correct match'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.merge_students(uuid,uuid[])'::regprocedure);
  o := d;
  d := replace(d, $q$  UPDATE class_attendance SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('class_attendance', v_n);

  UPDATE student_class_enrollments SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('enrollments', v_n);$q$, $r$  DELETE FROM lesson_bookings d USING lesson_bookings k
   WHERE d.student_id = ANY(p_drop_ids) AND k.student_id = p_keep_id
     AND k.lesson_date = d.lesson_date AND k.timetable_id IS NOT DISTINCT FROM d.timetable_id AND k.status <> 'rejected';
  UPDATE lesson_bookings SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_bookings', v_n);$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: merge'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.approve_student_merge_request(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, $q$  UPDATE class_attendance SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('class_attendance', v_n);

  UPDATE student_class_enrollments SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('enrollments', v_n);$q$, $r$  DELETE FROM lesson_bookings d USING lesson_bookings k
   WHERE d.student_id = ANY(v_drop_ids) AND k.student_id = v_keep_id
     AND k.lesson_date = d.lesson_date AND k.timetable_id IS NOT DISTINCT FROM d.timetable_id AND k.status <> 'rejected';
  UPDATE lesson_bookings SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_bookings', v_n);$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: approve merge'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.find_duplicate_students(jsonb)'::regprocedure);
  o := d;
  d := replace(d, $q$             coalesce((SELECT max(ca.attendance_date)::timestamptz FROM class_attendance ca WHERE ca.student_id = s.id), s.created_at),
             coalesce((SELECT max(e.updated_at) FROM student_class_enrollments e WHERE e.student_id = s.id), s.created_at),$q$, $r$             coalesce((SELECT max(lb.updated_at) FROM lesson_bookings lb WHERE lb.student_id = s.id), s.created_at),$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: find dup'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.public_find_duplicate_students(jsonb)'::regprocedure);
  o := d;
  d := replace(d, $q$             coalesce((SELECT max(ca.class_date)::timestamptz FROM class_attendance ca WHERE ca.student_id = s.id), s.created_at),
             coalesce((SELECT max(e.updated_at) FROM student_class_enrollments e WHERE e.student_id = s.id), s.created_at),$q$, $r$             coalesce((SELECT max(lb.updated_at) FROM lesson_bookings lb WHERE lb.student_id = s.id), s.created_at),$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: pub dup a'; END IF;
  o := d;
  d := replace(d, $q$         (SELECT count(*)::int FROM student_class_enrollments e WHERE e.student_id = s.id),
         (SELECT count(*)::int FROM class_attendance ca WHERE ca.student_id = s.id),$q$, $r$         0,
         (SELECT count(*)::int FROM lesson_bookings lb WHERE lb.student_id = s.id AND lb.status IN ('attended','absent')),$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: pub dup b'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.get_public_student_directory(text,text,text)'::regprocedure);
  o := d;
  d := regexp_replace(d, $q$  enrol AS \(\n.*?ORDER BY e\.student_id, e\.created_at DESC\n  \),$q$, $r$  enrol AS (
    SELECT lb.student_id,
      (array_agg(lb.class_type ORDER BY lb.lesson_date DESC))[1] AS class_type,
      NULL::text AS tier_name,
      array_agg(DISTINCT trim(to_char(lb.lesson_date,'Day')))::text[] AS enrolled_weekdays,
      ct.name AS term_name
    FROM lesson_bookings lb
    JOIN current_terms ct ON ct.id = lb.term_id
    WHERE lb.status IN ('booked','attended','absent')
    GROUP BY lb.student_id, ct.name
  ),$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: directory'; END IF;
  EXECUTE d;
END $do$;

DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.get_public_student_profile(uuid)'::regprocedure);
  o := d;
  d := regexp_replace(d, $q$  enrol AS \(\n.*?ORDER BY e\.student_id, e\.created_at DESC\n  \),$q$, $r$  enrol AS (
    SELECT lb.student_id,
      (array_agg(lb.class_type ORDER BY lb.lesson_date DESC))[1] AS class_type,
      NULL::text AS tier_name,
      array_agg(DISTINCT trim(to_char(lb.lesson_date,'Day')))::text[] AS enrolled_weekdays,
      ct.name AS term_name
    FROM lesson_bookings lb
    JOIN current_terms ct ON ct.id = lb.term_id
    WHERE lb.status IN ('booked','attended','absent')
      AND lb.student_id = p_student_id
    GROUP BY lb.student_id, ct.name
  ),$r$);
  IF d = o THEN RAISE EXCEPTION 'patch failed: profile'; END IF;
  EXECUTE d;
END $do$;

-- ===== /hello functions rebuilt on lesson_bookings =====
DROP FUNCTION IF EXISTS public.get_public_student_term_bookings(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_public_student_term_bookings(uuid, uuid, uuid);
CREATE FUNCTION public.get_public_student_term_bookings(p_session_id uuid, p_student_id uuid, p_term_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, scheduled_date date, start_time time, end_time time, timetable_id uuid, status text, class_type text, attendance_status text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_branch text; v_from date; v_to date;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;
  IF p_term_id IS NULL THEN
    SELECT r.start_date, r.end_date INTO v_from, v_to FROM public._resolve_public_student_term(p_student_id) r LIMIT 1;
  ELSE
    SELECT t.start_date, t.end_date INTO v_from, v_to FROM term_calendars t WHERE t.id = p_term_id AND t.branch_id = v_branch;
  END IF;
  IF v_from IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT lb.id, lb.lesson_date, lb.start_time, lb.end_time, lb.timetable_id,
         CASE lb.status WHEN 'booked' THEN 'scheduled' WHEN 'attended' THEN 'attended' WHEN 'absent' THEN 'attended' ELSE lb.status END,
         lb.class_type,
         CASE lb.status WHEN 'attended' THEN 'present' WHEN 'absent' THEN 'absent' ELSE NULL END
  FROM lesson_bookings lb
  WHERE lb.student_id = p_student_id AND lb.status <> 'rejected'
    AND lb.lesson_date BETWEEN v_from AND v_to
  ORDER BY lb.lesson_date, lb.start_time;
END $$;
GRANT EXECUTE ON FUNCTION public.get_public_student_term_bookings(uuid, uuid, uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_public_term_slot_capacities(uuid, uuid, uuid[]);
DROP FUNCTION IF EXISTS public.get_public_term_slot_capacities(uuid, uuid, uuid[], uuid);
CREATE FUNCTION public.get_public_term_slot_capacities(p_session_id uuid, p_student_id uuid, p_timetable_ids uuid[], p_term_id uuid DEFAULT NULL)
 RETURNS TABLE(scheduled_date date, timetable_id uuid, booked_count integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_branch text; v_from date; v_to date;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;
  IF p_term_id IS NULL THEN
    SELECT r.start_date, r.end_date INTO v_from, v_to FROM public._resolve_public_student_term(p_student_id) r LIMIT 1;
  ELSE
    SELECT t.start_date, t.end_date INTO v_from, v_to FROM term_calendars t WHERE t.id = p_term_id AND t.branch_id = v_branch;
  END IF;
  IF v_from IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT lb.lesson_date, lb.timetable_id, count(*)::int
  FROM lesson_bookings lb
  WHERE lb.timetable_id = ANY(p_timetable_ids) AND lb.status <> 'rejected'
    AND lb.lesson_date BETWEEN v_from AND v_to
  GROUP BY lb.lesson_date, lb.timetable_id;
END $$;
GRANT EXECUTE ON FUNCTION public.get_public_term_slot_capacities(uuid, uuid, uuid[], uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.attach_public_chat_planned_schedule(p_session_id uuid, p_student_id uuid, p_branch_id text, p_invoice_id uuid, p_term_id uuid, p_product_id uuid, p_slots jsonb)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_term record; v_slot jsonb; v_date date; v_tt record; v_booked int; v_n int := 0;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN RAISE EXCEPTION 'Invalid chat session'; END IF;
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' THEN RETURN 0; END IF;
  SELECT t.id, t.start_date, t.end_date INTO v_term FROM term_calendars t WHERE t.id = p_term_id AND t.branch_id = p_branch_id;
  IF v_term.id IS NULL THEN RAISE EXCEPTION 'Term not found for branch'; END IF;
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots) LOOP
    v_date := NULLIF(v_slot->>'date','')::date;
    SELECT * INTO v_tt FROM branch_timetables bt WHERE bt.id = NULLIF(v_slot->>'timetable_id','')::uuid AND bt.branch_id = p_branch_id;
    CONTINUE WHEN v_date IS NULL OR v_tt.id IS NULL OR v_date NOT BETWEEN v_term.start_date AND v_term.end_date;
    SELECT count(*) INTO v_booked FROM lesson_bookings WHERE timetable_id = v_tt.id AND lesson_date = v_date AND status <> 'rejected';
    CONTINUE WHEN v_booked >= coalesce(v_tt.max_capacity, 999);
    INSERT INTO lesson_bookings (student_id, branch_id, timetable_id, lesson_date, term_id, status, source, invoice_id, created_by)
    VALUES (p_student_id, p_branch_id, v_tt.id, v_date, v_term.id, 'requested', 'hello', p_invoice_id, 'public_hello_chat')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_n := v_n + 1; END IF;
  END LOOP;
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.hello_submit_lesson_request(p_session_id uuid, p_student_id uuid, p_bookings jsonb, p_cancellations jsonb DEFAULT '[]'::jsonb, p_notes text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_branch text; v_b jsonb; v_date date; v_tt record; v_term record; v_bal record;
  v_booked int; v_n int := 0; v_c int := 0; v_new_by_term jsonb := '{}'::jsonb; v_key text;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RAISE EXCEPTION 'Invalid chat session'; END IF;
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;

  FOR v_b IN SELECT * FROM jsonb_array_elements(coalesce(p_cancellations,'[]'::jsonb)) LOOP
    UPDATE lesson_bookings SET cancel_requested = true, notes = coalesce(p_notes, notes)
     WHERE id = NULLIF(v_b->>'scheduled_class_id','')::uuid AND student_id = p_student_id
       AND status IN ('booked','requested') AND lesson_date >= current_date;
    IF FOUND THEN v_c := v_c + 1; END IF;
  END LOOP;

  FOR v_b IN SELECT * FROM jsonb_array_elements(coalesce(p_bookings,'[]'::jsonb)) LOOP
    v_date := NULLIF(v_b->>'date','')::date;
    SELECT * INTO v_tt FROM branch_timetables bt WHERE bt.id = NULLIF(v_b->>'timetable_id','')::uuid AND bt.branch_id = v_branch AND bt.is_active;
    IF v_date IS NULL OR v_tt.id IS NULL OR v_date < current_date THEN CONTINUE; END IF;
    IF EXTRACT(DOW FROM v_date)::int <> v_tt.weekday THEN CONTINUE; END IF;
    SELECT t.id, t.start_date, t.end_date INTO v_term FROM term_calendars t
     WHERE t.branch_id = v_branch AND v_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
    IF v_term.id IS NULL THEN RAISE EXCEPTION 'No term found for %', to_char(v_date,'DD/MM/YYYY'); END IF;
    SELECT count(*) INTO v_booked FROM lesson_bookings WHERE timetable_id = v_tt.id AND lesson_date = v_date AND status <> 'rejected';
    IF v_booked >= coalesce(v_tt.max_capacity,999) THEN RAISE EXCEPTION 'The % class on % is full', to_char(v_tt.start_time,'HH24:MI'), to_char(v_date,'DD/MM/YYYY'); END IF;
    SELECT * INTO v_bal FROM public._lesson_balance(p_student_id, v_branch, v_term.start_date, v_term.end_date);
    v_key := v_term.id::text;
    IF NOT v_bal.unlimited AND v_bal.available + v_c <= coalesce((v_new_by_term->>v_key)::int,0) THEN
      RAISE EXCEPTION 'Lesson limit reached for this term. Please contact the branch to add more lessons.';
    END IF;
    INSERT INTO lesson_bookings (student_id, branch_id, timetable_id, lesson_date, term_id, status, source, notes, created_by)
    VALUES (p_student_id, v_branch, v_tt.id, v_date, v_term.id, 'requested', 'hello', p_notes, 'public_hello_chat')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_n := v_n + 1;
      v_new_by_term := v_new_by_term || jsonb_build_object(v_key, coalesce((v_new_by_term->>v_key)::int,0) + 1);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('requested', v_n, 'cancel_requested', v_c);
END $$;
GRANT EXECUTE ON FUNCTION public.hello_submit_lesson_request(uuid, uuid, jsonb, jsonb, text) TO anon, authenticated, service_role;

-- ===== /access Attendance functions =====
CREATE OR REPLACE FUNCTION public._access_branch_check(p_password text, p_branch_id text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := public._access_scope(p_password);
BEGIN
  IF p_branch_id IS NULL OR NOT public._scope_has(v_scope, p_branch_id) THEN
    RAISE EXCEPTION 'Not allowed for this branch';
  END IF;
  RETURN v_scope;
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_week(p_password text, p_branch_id text, p_week_start date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_end date := p_week_start + 6; v_country text;
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  SELECT country INTO v_country FROM branches WHERE id = p_branch_id;
  RETURN jsonb_build_object(
    'slots', coalesce((SELECT jsonb_agg(to_jsonb(bt) ORDER BY bt.weekday, bt.start_time) FROM branch_timetables bt
                        WHERE bt.branch_id = p_branch_id AND bt.is_active), '[]'::jsonb),
    'holidays', coalesce((SELECT jsonb_agg(jsonb_build_object('date', h.date, 'name', h.name)) FROM public_holidays h
                        WHERE h.date BETWEEN p_week_start AND v_end AND (h.country IS NULL OR v_country IS NULL OR lower(h.country) = lower(v_country))), '[]'::jsonb),
    'terms', coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'start_date', t.start_date, 'end_date', t.end_date))
                        FROM term_calendars t WHERE t.branch_id = p_branch_id AND t.start_date <= v_end AND t.end_date >= p_week_start), '[]'::jsonb),
    'breaks', coalesce((SELECT jsonb_agg(jsonb_build_object('name', b.name, 'start_date', b.start_date, 'end_date', b.end_date))
                        FROM term_breaks b JOIN term_calendars t ON t.id = b.term_id
                        WHERE t.branch_id = p_branch_id AND b.start_date <= v_end AND b.end_date >= p_week_start), '[]'::jsonb),
    'bookings', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', lb.id, 'student_id', lb.student_id, 'timetable_id', lb.timetable_id, 'lesson_date', lb.lesson_date,
          'start_time', lb.start_time, 'end_time', lb.end_time, 'class_type', lb.class_type,
          'status', lb.status, 'source', lb.source, 'cancel_requested', lb.cancel_requested, 'notes', lb.notes,
          'created_at', lb.created_at,
          'student_name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))),
          'current_belt', s.current_belt, 'date_of_birth', s.date_of_birth, 'student_status', s.status)
          ORDER BY s.first_name, s.last_name)
        FROM lesson_bookings lb JOIN students s ON s.id = lb.student_id
        WHERE lb.branch_id = p_branch_id AND lb.lesson_date BETWEEN p_week_start AND v_end AND lb.status <> 'rejected'), '[]'::jsonb),
    'requests', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', lb.id, 'lesson_date', lb.lesson_date, 'start_time', lb.start_time, 'end_time', lb.end_time,
          'class_type', lb.class_type, 'status', lb.status, 'cancel_requested', lb.cancel_requested, 'notes', lb.notes,
          'created_at', lb.created_at, 'student_id', lb.student_id,
          'student_name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')))) ORDER BY lb.created_at)
        FROM lesson_bookings lb JOIN students s ON s.id = lb.student_id
        WHERE lb.branch_id = p_branch_id AND lb.lesson_date >= current_date - 7
          AND (lb.status = 'requested' OR lb.cancel_requested)), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_students(p_password text, p_branch_id text, p_search text DEFAULT NULL, p_date date DEFAULT NULL)
RETURNS TABLE(id uuid, name text, current_belt text, date_of_birth date, status text, remaining integer, pending integer, unlimited boolean, available integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from date; v_to date; v_d date := coalesce(p_date, current_date);
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  SELECT t.start_date, t.end_date INTO v_from, v_to FROM term_calendars t
   WHERE t.branch_id = p_branch_id AND v_d BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  v_from := coalesce(v_from, v_d); v_to := coalesce(v_to, v_d);
  RETURN QUERY
  SELECT s.id, upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))), s.current_belt, s.date_of_birth, s.status,
         b.remaining, b.pending, b.unlimited, b.available
  FROM students s
  CROSS JOIN LATERAL public._lesson_balance(s.id, p_branch_id, v_from, v_to) b
  WHERE s.branch_id = p_branch_id AND s.status IN ('active','trial')
    AND (coalesce(trim(p_search),'') = '' OR (coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) ILIKE '%'||trim(p_search)||'%'
         OR (coalesce(s.last_name,'')||' '||coalesce(s.first_name,'')) ILIKE '%'||trim(p_search)||'%')
  ORDER BY s.first_name, s.last_name
  LIMIT 30;
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_add(p_password text, p_timetable_id uuid, p_date date, p_student_id uuid, p_force boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tt record; v_term record; v_bal record; v_id uuid; v_branch text;
BEGIN
  SELECT * INTO v_tt FROM branch_timetables WHERE id = p_timetable_id;
  IF v_tt.id IS NULL THEN RAISE EXCEPTION 'Timeslot not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_tt.branch_id);
  IF EXTRACT(DOW FROM p_date)::int <> v_tt.weekday THEN RAISE EXCEPTION 'Date does not match this timeslot'; END IF;
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  SELECT t.id, t.start_date, t.end_date INTO v_term FROM term_calendars t
   WHERE t.branch_id = v_tt.branch_id AND p_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  SELECT * INTO v_bal FROM public._lesson_balance(p_student_id, v_tt.branch_id, coalesce(v_term.start_date, p_date), coalesce(v_term.end_date, p_date));
  IF NOT p_force AND NOT v_bal.unlimited AND v_bal.available <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'limit_reached', true, 'remaining', v_bal.remaining, 'pending', v_bal.pending);
  END IF;
  INSERT INTO lesson_bookings (student_id, branch_id, timetable_id, lesson_date, term_id, status, source, created_by, approved_by, approved_at)
  VALUES (p_student_id, v_tt.branch_id, v_tt.id, p_date, v_term.id, 'booked', 'staff', 'access', 'access', now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Student is already in this timeslot'; END IF;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_mark(p_password text, p_booking_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_branch text;
BEGIN
  IF p_status NOT IN ('attended','absent','booked') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT branch_id INTO v_branch FROM lesson_bookings WHERE id = p_booking_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  UPDATE lesson_bookings SET status = p_status, marked_by = 'access', marked_at = CASE WHEN p_status='booked' THEN NULL ELSE now() END,
         approved_at = coalesce(approved_at, now()), approved_by = coalesce(approved_by, 'access')
   WHERE id = p_booking_id AND status <> 'rejected';
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_remove(p_password text, p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_branch text;
BEGIN
  SELECT branch_id INTO v_branch FROM lesson_bookings WHERE id = p_booking_id;
  IF v_branch IS NULL THEN RETURN; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  DELETE FROM lesson_bookings WHERE id = p_booking_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_review(p_password text, p_booking_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b record;
BEGIN
  SELECT * INTO v_b FROM lesson_bookings WHERE id = p_booking_id;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_b.branch_id);
  IF v_b.cancel_requested THEN
    IF p_approve THEN DELETE FROM lesson_bookings WHERE id = p_booking_id;
    ELSE UPDATE lesson_bookings SET cancel_requested = false WHERE id = p_booking_id; END IF;
  ELSIF v_b.status = 'requested' THEN
    UPDATE lesson_bookings SET status = CASE WHEN p_approve THEN 'booked' ELSE 'rejected' END,
           approved_by = 'access', approved_at = now() WHERE id = p_booking_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.access_attendance_settings(p_password text, p_branch_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  RETURN jsonb_build_object(
    'slots', coalesce((SELECT jsonb_agg(to_jsonb(bt) ORDER BY bt.weekday, bt.start_time) FROM branch_timetables bt WHERE bt.branch_id = p_branch_id), '[]'::jsonb),
    'class_types', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.sort_order, c.name) FROM lesson_class_types c WHERE c.branch_id IS NULL OR c.branch_id = p_branch_id), '[]'::jsonb),
    'terms', coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'start_date', t.start_date, 'end_date', t.end_date,
                 'is_active', t.is_active, 'year', t.year, 'term_number', t.term_number,
                 'breaks', coalesce((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'start_date', b.start_date, 'end_date', b.end_date) ORDER BY b.start_date)
                                     FROM term_breaks b WHERE b.term_id = t.id), '[]'::jsonb)) ORDER BY t.start_date DESC)
               FROM term_calendars t WHERE t.branch_id = p_branch_id), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.access_timetable_upsert(p_password text, p_row jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := NULLIF(p_row->>'id','')::uuid; v_branch text := p_row->>'branch_id'; v_old text;
BEGIN
  IF v_id IS NOT NULL THEN
    SELECT branch_id INTO v_old FROM branch_timetables WHERE id = v_id;
    PERFORM public._access_branch_check(p_password, v_old);
  END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF (p_row->>'weekday') IS NULL OR NULLIF(p_row->>'start_time','') IS NULL OR NULLIF(p_row->>'end_time','') IS NULL THEN
    RAISE EXCEPTION 'Day, start and end time are required';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO branch_timetables (branch_id, weekday, start_time, end_time, class_type, age_from, age_to, belt_levels, max_capacity, instructor_name, is_active, created_by, updated_by)
    VALUES (v_branch, (p_row->>'weekday')::int, (p_row->>'start_time')::time, (p_row->>'end_time')::time, NULLIF(p_row->>'class_type',''),
            NULLIF(p_row->>'age_from','')::numeric, NULLIF(p_row->>'age_to','')::numeric,
            CASE WHEN jsonb_typeof(p_row->'belt_levels')='array' THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'belt_levels')) ELSE NULL END,
            coalesce(NULLIF(p_row->>'max_capacity','')::int, 20), NULLIF(p_row->>'instructor_name',''), coalesce((p_row->>'is_active')::boolean, true), 'access', 'access')
    RETURNING id INTO v_id;
  ELSE
    UPDATE branch_timetables SET branch_id = v_branch, weekday = (p_row->>'weekday')::int, start_time = (p_row->>'start_time')::time,
      end_time = (p_row->>'end_time')::time, class_type = NULLIF(p_row->>'class_type',''),
      age_from = NULLIF(p_row->>'age_from','')::numeric, age_to = NULLIF(p_row->>'age_to','')::numeric,
      belt_levels = CASE WHEN jsonb_typeof(p_row->'belt_levels')='array' THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'belt_levels')) ELSE belt_levels END,
      max_capacity = coalesce(NULLIF(p_row->>'max_capacity','')::int, max_capacity), instructor_name = NULLIF(p_row->>'instructor_name',''),
      is_active = coalesce((p_row->>'is_active')::boolean, is_active), updated_by = 'access', updated_at = now()
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_class_type_upsert(p_password text, p_branch_id text, p_id uuid, p_name text, p_is_active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := p_id;
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  IF coalesce(trim(p_name),'') = '' THEN RAISE EXCEPTION 'Class name is required'; END IF;
  IF v_id IS NULL THEN
    INSERT INTO lesson_class_types (name, branch_id, is_active) VALUES (trim(p_name), NULL, coalesce(p_is_active,true)) RETURNING id INTO v_id;
  ELSE
    UPDATE lesson_class_types SET name = trim(p_name), is_active = coalesce(p_is_active, is_active) WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_term_upsert(p_password text, p_row jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := NULLIF(p_row->>'id','')::uuid; v_branch text := p_row->>'branch_id'; v_old text; v_s date; v_e date;
BEGIN
  IF v_id IS NOT NULL THEN
    SELECT branch_id INTO v_old FROM term_calendars WHERE id = v_id;
    PERFORM public._access_branch_check(p_password, v_old);
  END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  v_s := NULLIF(p_row->>'start_date','')::date; v_e := NULLIF(p_row->>'end_date','')::date;
  IF coalesce(trim(p_row->>'name'),'') = '' OR v_s IS NULL OR v_e IS NULL OR v_e < v_s THEN
    RAISE EXCEPTION 'Term name and a valid start/end date are required';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO term_calendars (name, branch_id, start_date, end_date, is_active, year, term_number, created_by, updated_by)
    VALUES (trim(p_row->>'name'), v_branch, v_s, v_e, coalesce((p_row->>'is_active')::boolean, true),
            coalesce(NULLIF(p_row->>'year','')::int, EXTRACT(YEAR FROM v_s)::int), NULLIF(p_row->>'term_number','')::int, 'access', 'access')
    RETURNING id INTO v_id;
  ELSE
    UPDATE term_calendars SET name = trim(p_row->>'name'), start_date = v_s, end_date = v_e,
      is_active = coalesce((p_row->>'is_active')::boolean, is_active),
      year = coalesce(NULLIF(p_row->>'year','')::int, year), term_number = coalesce(NULLIF(p_row->>'term_number','')::int, term_number),
      updated_by = 'access', updated_at = now()
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_term_break_save(p_password text, p_term_id uuid, p_id uuid, p_name text, p_start date, p_end date, p_delete boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_branch text;
BEGIN
  SELECT branch_id INTO v_branch FROM term_calendars WHERE id = p_term_id;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF p_delete THEN DELETE FROM term_breaks WHERE id = p_id AND term_id = p_term_id; RETURN; END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN RAISE EXCEPTION 'Valid break dates are required'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO term_breaks (term_id, name, start_date, end_date, created_by, updated_by) VALUES (p_term_id, coalesce(NULLIF(trim(p_name),''),'Break'), p_start, p_end, 'access', 'access');
  ELSE
    UPDATE term_breaks SET name = coalesce(NULLIF(trim(p_name),''),'Break'), start_date = p_start, end_date = p_end, updated_by = 'access', updated_at = now()
     WHERE id = p_id AND term_id = p_term_id;
  END IF;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY[
    'access_attendance_week(text,text,date)','access_attendance_students(text,text,text,date)',
    'access_attendance_add(text,uuid,date,uuid,boolean)','access_attendance_mark(text,uuid,text)',
    'access_attendance_remove(text,uuid)','access_attendance_review(text,uuid,boolean)',
    'access_attendance_settings(text,text)','access_timetable_upsert(text,jsonb)',
    'access_class_type_upsert(text,text,uuid,text,boolean)','access_term_upsert(text,jsonb)',
    'access_term_break_save(text,uuid,uuid,text,date,date,boolean)'] LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO anon, authenticated, service_role', f);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public._lesson_balance(uuid,text,date,date) FROM anon;
REVOKE EXECUTE ON FUNCTION public._access_branch_check(text,text) FROM anon, authenticated;

DO $do$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
     AND p.prosrc ~* '(class_attendance|student_scheduled_classes|student_class_enrollments)' LOOP
    RAISE EXCEPTION 'Still references old tables: %', r.sig;
  END LOOP;
END $do$;

-- ===== Remove old student attendance (permanent) =====
DROP TABLE IF EXISTS public.class_attendance CASCADE;
DROP TABLE IF EXISTS public.student_scheduled_classes CASCADE;
DROP TABLE IF EXISTS public.student_class_enrollments CASCADE;