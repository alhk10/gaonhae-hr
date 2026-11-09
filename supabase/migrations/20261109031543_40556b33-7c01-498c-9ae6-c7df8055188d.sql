ALTER TABLE public.grading_slots
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slot_kind text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS grading_year integer,
  ADD COLUMN IF NOT EXISTS grading_term integer;
ALTER TABLE public.grading_registrations ADD COLUMN IF NOT EXISTS original_grading_slot_id uuid;
ALTER TABLE public.grading_payment_submissions ADD COLUMN IF NOT EXISTS original_resolved_slot_id uuid;

-- backfill year/term from term calendars (fallback: year only)
UPDATE public.grading_slots s SET grading_year = EXTRACT(YEAR FROM s.grading_date)::int WHERE grading_year IS NULL;
UPDATE public.grading_slots s SET grading_term = t.term_number
FROM (SELECT DISTINCT ON (gs.id) gs.id sid, tc.term_number
      FROM public.grading_slots gs JOIN public.term_calendars tc
        ON gs.grading_date BETWEEN tc.start_date AND tc.end_date + 14 AND tc.term_number IS NOT NULL
      ORDER BY gs.id, (tc.branch_id = gs.branch_id) DESC NULLS LAST, tc.start_date DESC) t
WHERE s.id = t.sid AND s.grading_term IS NULL;

-- Hide hidden slots from all public (/hello) slot lookups
DO $$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('get_public_grading_slots','get_public_grading_slots_by_date') LOOP
    d := pg_get_functiondef(r.oid);
    IF position('is_hidden' in d) = 0 THEN
      d := replace(d, 'COALESCE(gs.status, ''active'') <> ''cancelled''',
                      'COALESCE(gs.status, ''active'') <> ''cancelled'' AND NOT COALESCE(gs.is_hidden, false)');
      EXECUTE d;
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.admin_list_grading_slots();
CREATE FUNCTION public.admin_list_grading_slots()
 RETURNS TABLE(id uuid, branch_id text, branch_name text, grading_date date, start_time time, end_time time, title text, location text, belt_levels text[], grading_product_ids uuid[], min_age integer, max_age integer, available_branch_ids text[], registration_count bigint, is_hidden boolean, slot_kind text, grading_year integer, grading_term integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  SELECT s.id, s.branch_id, b.name, s.grading_date, s.start_time, s.end_time, s.title, s.location,
    s.belt_levels::text[], s.grading_product_ids::uuid[], s.min_age, s.max_age, s.available_branch_ids::text[],
    (SELECT COUNT(*) FROM public.grading_registrations r WHERE r.grading_slot_id = s.id)
    + (SELECT COUNT(*) FROM public.grading_payment_submissions gs WHERE gs.resolved_grading_slot_id = s.id),
    s.is_hidden, s.slot_kind, s.grading_year, s.grading_term
  FROM public.grading_slots s LEFT JOIN public.branches b ON b.id = s.branch_id
  ORDER BY s.grading_date DESC, s.start_time NULLS LAST;
$f$;

CREATE OR REPLACE FUNCTION public.admin_set_grading_slot_meta(p_id uuid, p_is_hidden boolean, p_slot_kind text, p_year integer, p_term integer)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $f$
  UPDATE public.grading_slots SET is_hidden = COALESCE(p_is_hidden,false),
    slot_kind = CASE WHEN p_slot_kind = 'double_promotion' THEN 'double_promotion' ELSE 'regular' END,
    grading_year = p_year, grading_term = p_term, updated_at = now()
  WHERE id = p_id;
$f$;

CREATE OR REPLACE FUNCTION public._double_promotion_slot(p_slot_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE s public.grading_slots; v uuid;
BEGIN
  SELECT * INTO s FROM public.grading_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF s.slot_kind = 'double_promotion' THEN RETURN s.id; END IF;
  SELECT id INTO v FROM public.grading_slots
   WHERE slot_kind = 'double_promotion' AND grading_date = s.grading_date AND branch_id IS NOT DISTINCT FROM s.branch_id
   ORDER BY created_at LIMIT 1;
  IF v IS NULL THEN
    INSERT INTO public.grading_slots (branch_id, grading_date, start_time, end_time, title, location, is_hidden, slot_kind, grading_year, grading_term)
    VALUES (s.branch_id, s.grading_date, s.start_time, s.end_time, 'Double promotion', s.location, true, 'double_promotion', s.grading_year, s.grading_term)
    RETURNING id INTO v;
  END IF;
  RETURN v;
END $f$;

CREATE OR REPLACE FUNCTION public.admin_update_grading_remark(p_registration_id uuid, p_remark text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE r public.grading_registrations; v_new text := NULLIF(btrim(p_remark), ''); v_dp uuid;
BEGIN
  SELECT * INTO r FROM public.grading_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF lower(COALESCE(v_new,'')) = 'double testing' AND r.grading_slot_id IS NOT NULL THEN
    v_dp := public._double_promotion_slot(r.grading_slot_id);
    UPDATE public.grading_registrations SET remark = v_new,
      original_grading_slot_id = COALESCE(original_grading_slot_id, CASE WHEN grading_slot_id <> v_dp THEN grading_slot_id END),
      grading_slot_id = v_dp WHERE id = r.id;
  ELSIF r.original_grading_slot_id IS NOT NULL THEN
    UPDATE public.grading_registrations SET remark = v_new, grading_slot_id = original_grading_slot_id,
      original_grading_slot_id = NULL WHERE id = r.id;
  ELSE
    UPDATE public.grading_registrations SET remark = v_new WHERE id = r.id;
  END IF;
END $f$;

DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.admin_update_grading_submission_remark(uuid,text)'::regprocedure) INTO d;
  RAISE NOTICE '%', d;
END $$;