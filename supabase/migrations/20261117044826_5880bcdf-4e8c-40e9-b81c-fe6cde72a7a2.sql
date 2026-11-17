CREATE TABLE public.student_branches (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, branch_id)
);
GRANT SELECT ON public.student_branches TO anon, authenticated;
GRANT ALL ON public.student_branches TO service_role;
ALTER TABLE public.student_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read student branches" ON public.student_branches FOR SELECT USING (true);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issued_at_branch text;
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS branch_scopes text[];

CREATE OR REPLACE FUNCTION public._student_at_branch(p_student uuid, p_branch text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM students s WHERE s.id = p_student AND s.branch_id = p_branch)
      OR EXISTS (SELECT 1 FROM student_branches sb WHERE sb.student_id = p_student AND sb.branch_id = p_branch);
$$;

CREATE OR REPLACE FUNCTION public.access_student_branch_set(p_password text, p_student_id uuid, p_branch_id text, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_home text; v_actor text;
BEGIN
  IF public.is_superadmin(coalesce(auth.jwt()->>'email','')) THEN v_actor := auth.jwt()->>'email';
  ELSE PERFORM public._access_require_all(p_password); v_actor := 'access:all-branch'; END IF;
  SELECT branch_id INTO v_home FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF p_branch_id = v_home THEN RAISE EXCEPTION 'This is already the home branch'; END IF;
  IF p_on THEN
    INSERT INTO student_branches(student_id, branch_id, added_by) VALUES (p_student_id, p_branch_id, v_actor) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM student_branches WHERE student_id = p_student_id AND branch_id = p_branch_id;
  END IF;
  INSERT INTO student_change_logs(student_id, action, field_name, new_value, changed_by)
  VALUES (p_student_id, CASE WHEN p_on THEN 'branch_added' ELSE 'branch_removed' END, 'extra_branch', p_branch_id, v_actor);
END $$;
REVOKE ALL ON FUNCTION public.access_student_branch_set(text, uuid, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.access_student_branch_set(text, uuid, text, boolean) TO anon, authenticated;

-- Payments and finance stay at the home branch
CREATE OR REPLACE FUNCTION public._invoice_home_branch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_home text;
BEGIN
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;
  SELECT branch_id INTO v_home FROM students WHERE id = NEW.student_id;
  IF v_home IS NOT NULL AND NEW.branch_id IS DISTINCT FROM v_home
     AND EXISTS (SELECT 1 FROM student_branches WHERE student_id = NEW.student_id AND branch_id = NEW.branch_id) THEN
    NEW.issued_at_branch := NEW.branch_id;
    NEW.branch_id := v_home;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_invoice_home_branch ON public.invoices;
CREATE TRIGGER trg_invoice_home_branch BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public._invoice_home_branch();

-- Lesson pools valid at the issuing branch and any shared branches
CREATE OR REPLACE FUNCTION public._entitlement_branch_scopes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_issued text; v_inv_branch text; v_valid text[];
BEGIN
  IF NEW.source_type = 'invoice_item' AND NEW.source_id IS NOT NULL THEN
    SELECT i.issued_at_branch, i.branch_id,
           CASE WHEN jsonb_typeof(ii.metadata->'valid_branch_ids') = 'array'
                THEN ARRAY(SELECT jsonb_array_elements_text(ii.metadata->'valid_branch_ids')) END
      INTO v_issued, v_inv_branch, v_valid
      FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id WHERE ii.id = NEW.source_id;
    IF v_issued IS NOT NULL THEN
      NEW.branch_scope := v_issued;
    END IF;
    IF v_valid IS NOT NULL AND array_length(v_valid,1) > 0 THEN
      NEW.branch_scopes := ARRAY(SELECT DISTINCT x FROM unnest(v_valid || ARRAY[coalesce(v_issued, v_inv_branch)]) x WHERE x IS NOT NULL);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_entitlement_branch_scopes ON public.entitlements;
CREATE TRIGGER trg_entitlement_branch_scopes BEFORE INSERT ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public._entitlement_branch_scopes();

CREATE OR REPLACE FUNCTION public._lesson_balance(p_student_id uuid, p_branch_id text, p_from date, p_to date)
 RETURNS TABLE(remaining integer, pending integer, unlimited boolean, available integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rem integer; v_pend integer; v_unl boolean;
BEGIN
  SELECT coalesce(sum(GREATEST(0, e.sessions_total - coalesce(e.sessions_used,0))) FILTER (WHERE e.sessions_total IS NOT NULL),0)::int,
         bool_or(e.sessions_total IS NULL OR p.name ILIKE '%unlimited%')
    INTO v_rem, v_unl
    FROM public.entitlements e LEFT JOIN public.products p ON p.id = e.product_id
   WHERE e.student_id = p_student_id AND e.is_active
     AND (e.valid_from IS NULL OR e.valid_from <= p_to)
     AND (e.valid_to IS NULL OR e.valid_to >= p_from)
     AND (e.branch_scope IS NULL OR e.branch_scope = '' OR e.branch_scope = p_branch_id OR p_branch_id = ANY(coalesce(e.branch_scopes,'{}')));
  SELECT count(*)::int INTO v_pend FROM public.lesson_bookings lb
   WHERE lb.student_id = p_student_id AND lb.status IN ('requested','booked')
     AND lb.lesson_date BETWEEN p_from AND p_to;
  RETURN QUERY SELECT v_rem, v_pend, coalesce(v_unl,false),
    CASE WHEN coalesce(v_unl,false) THEN 999 ELSE GREATEST(0, v_rem - v_pend) END;
END $function$;

CREATE OR REPLACE FUNCTION public._lesson_bookings_entitlement()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
       AND (e.branch_scope IS NULL OR e.branch_scope = '' OR e.branch_scope = NEW.branch_id OR NEW.branch_id = ANY(coalesce(e.branch_scopes,'{}')))
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
END $function$;

-- Shared-term lines count as paid at each listed branch's matching term
CREATE OR REPLACE FUNCTION public._term_paid_weeks(p_student_id uuid, p_term_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(CASE WHEN ii.metadata->>'payment_plan' = 'four_weeks'
      THEN COALESCE(NULLIF(ii.metadata->>'weeks','')::int, 4)
      ELSE COALESCE(NULLIF(ii.metadata->>'weeks','')::int, CEIL(COALESCE(ii.quantity,0))::int) END), 0)::int
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN products p ON p.id = ii.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE i.student_id = p_student_id AND pc.name = 'Classes'
    AND COALESCE(p.is_adhoc_lesson,false) = false
    AND i.status IN ('paid','verified')
    AND (coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
      OR (jsonb_typeof(ii.metadata->'valid_branch_ids') = 'array'
          AND EXISTS (SELECT 1 FROM term_calendars tt, term_calendars ot
                       WHERE tt.id = p_term_id AND ot.id::text = coalesce(ii.metadata->>'term_id', p.term_id::text)
                         AND ot.start_date = tt.start_date
                         AND ii.metadata->'valid_branch_ids' ? tt.branch_id)));
$function$;

CREATE OR REPLACE FUNCTION public.access_attendance_students(p_password text, p_branch_id text, p_search text DEFAULT NULL::text, p_date date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, name text, current_belt text, date_of_birth date, status text, remaining integer, pending integer, unlimited boolean, available integer, term_payment text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_from date; v_to date; v_term uuid; v_d date := coalesce(p_date, current_date);
BEGIN
  PERFORM public._access_branch_check_read(p_password, p_branch_id);
  SELECT t.id, t.start_date, t.end_date INTO v_term, v_from, v_to FROM term_calendars t
   WHERE t.branch_id = p_branch_id AND v_d BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  v_from := coalesce(v_from, v_d); v_to := coalesce(v_to, v_d);
  RETURN QUERY
  SELECT s.id, upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))), s.current_belt, s.date_of_birth, s.status,
         b.remaining, b.pending, b.unlimited, b.available,
         CASE WHEN v_term IS NULL THEN NULL ELSE public._term_payment_status(s.id, v_term)::text END
  FROM students s
  CROSS JOIN LATERAL public._lesson_balance(s.id, p_branch_id, v_from, v_to) b
  WHERE (s.branch_id = p_branch_id OR EXISTS (SELECT 1 FROM student_branches sb WHERE sb.student_id = s.id AND sb.branch_id = p_branch_id))
    AND s.status IN ('active','trial')
    AND (coalesce(trim(p_search),'') = '' OR (coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) ILIKE '%'||trim(p_search)||'%'
         OR (coalesce(s.last_name,'')||' '||coalesce(s.first_name,'')) ILIKE '%'||trim(p_search)||'%')
  ORDER BY s.first_name, s.last_name
  LIMIT 30;
END $function$;