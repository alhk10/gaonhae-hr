ALTER TABLE public.student_grading_history DROP CONSTRAINT IF EXISTS student_grading_history_grading_registration_id_key;
CREATE UNIQUE INDEX student_grading_history_reg_step_key ON public.student_grading_history (grading_registration_id, belt_from);

-- Each record uses only its own fee line (combined steps handled by _grading_steps)
CREATE OR REPLACE FUNCTION public._grading_effective_belts(p_reg_id uuid, OUT belt_from text, OUT belt_to text)
 RETURNS record LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r grading_registrations%ROWTYPE; v_desc text; v_m text[];
BEGIN
  SELECT * INTO r FROM grading_registrations WHERE id = p_reg_id;
  belt_from := r.current_belt; belt_to := r.target_belt;
  IF r.invoice_item_id IS NOT NULL THEN
    SELECT ii.description INTO v_desc FROM invoice_items ii WHERE ii.id = r.invoice_item_id;
    v_m := regexp_match(coalesce(v_desc,''), '^\s*(.+?)\s*>>\s*(.+?)\s*$');
    IF v_m IS NOT NULL THEN belt_from := initcap(v_m[1]); belt_to := initcap(v_m[2]); END IF;
  END IF;
  IF lower(coalesce(r.result,'')) = 'double' AND _next_belt(belt_to) IS NOT NULL THEN
    belt_to := _next_belt(belt_to);
  END IF;
END $function$;

-- Steps graded by a registration: its own line plus following Foundation lines on the same invoice
CREATE OR REPLACE FUNCTION public._grading_steps(p_reg_id uuid)
 RETURNS TABLE(step int, belt_from text, belt_to text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r grading_registrations%ROWTYPE; v_inv uuid; v_desc text; v_m text[]; v_f text; v_t text; v_next text; i int := 1;
BEGIN
  SELECT * INTO r FROM grading_registrations WHERE id = p_reg_id;
  v_f := r.current_belt; v_t := r.target_belt;
  IF r.invoice_item_id IS NOT NULL THEN
    SELECT ii.description, ii.invoice_id INTO v_desc, v_inv FROM invoice_items ii WHERE ii.id = r.invoice_item_id;
    v_m := regexp_match(coalesce(v_desc,''), '^\s*(.+?)\s*>>\s*(.+?)\s*$');
    IF v_m IS NOT NULL THEN v_f := initcap(v_m[1]); v_t := initcap(v_m[2]); END IF;
  END IF;
  step := i; belt_from := v_f; belt_to := v_t; RETURN NEXT;
  IF v_m IS NOT NULL AND v_f ILIKE 'Foundation%' THEN
    LOOP
      EXIT WHEN i >= 5 OR v_t NOT ILIKE 'Foundation%';
      SELECT initcap(m[2]) INTO v_next FROM invoice_items ii2,
        LATERAL regexp_match(ii2.description, '^\s*(.+?)\s*>>\s*(.+?)\s*$') m
        WHERE ii2.invoice_id = v_inv AND ii2.id <> r.invoice_item_id AND lower(trim(m[1])) = lower(v_t) LIMIT 1;
      EXIT WHEN v_next IS NULL;
      i := i + 1; step := i; belt_from := v_t; belt_to := v_next; RETURN NEXT;
      v_t := v_next; v_next := NULL;
    END LOOP;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public._grading_reg_sync_history()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_date date; v_branch text; v_from text; v_to text; o_from text; o_to text; s record; v_last int;
BEGIN
  SELECT gs.grading_date, COALESCE(NEW.branch_id::text, gs.branch_id::text) INTO v_date, v_branch
    FROM grading_slots gs WHERE gs.id = NEW.grading_slot_id;
  SELECT max(step) INTO v_last FROM _grading_steps(NEW.id);
  SELECT x.belt_from INTO v_from FROM _grading_steps(NEW.id) x WHERE step = 1;
  SELECT x.belt_to INTO v_to FROM _grading_steps(NEW.id) x WHERE step = v_last;
  IF lower(coalesce(NEW.result,'')) = 'double' AND _next_belt(v_to) IS NOT NULL THEN v_to := _next_belt(v_to); END IF;
  IF lower(coalesce(NEW.result,'')) IN ('pass','double') AND v_to IS NOT NULL THEN
    DELETE FROM student_grading_history WHERE grading_registration_id = NEW.id
      AND belt_from NOT IN (SELECT x.belt_from FROM _grading_steps(NEW.id) x);
    FOR s IN SELECT * FROM _grading_steps(NEW.id) LOOP
      INSERT INTO student_grading_history (student_id, belt_from, belt_to, grading_date, result, branch_id, grading_registration_id, notes)
      VALUES (NEW.student_id, s.belt_from,
        CASE WHEN s.step = v_last AND lower(NEW.result)='double' THEN coalesce(_next_belt(s.belt_to), s.belt_to) ELSE s.belt_to END,
        coalesce(v_date, current_date), CASE WHEN s.step = v_last THEN lower(NEW.result) ELSE 'pass' END, v_branch, NEW.id, NEW.remark)
      ON CONFLICT (grading_registration_id, belt_from) DO UPDATE SET
        student_id = EXCLUDED.student_id, belt_to = EXCLUDED.belt_to, grading_date = EXCLUDED.grading_date,
        result = EXCLUDED.result, branch_id = EXCLUDED.branch_id, notes = EXCLUDED.notes, updated_at = now();
    END LOOP;
    IF NOT EXISTS (
      SELECT 1 FROM grading_registrations g2 JOIN grading_slots s2 ON s2.id = g2.grading_slot_id
      WHERE g2.student_id = NEW.student_id AND g2.id <> NEW.id
        AND lower(coalesce(g2.result,'')) IN ('pass','double') AND s2.grading_date > coalesce(v_date, current_date)
    ) THEN
      UPDATE students SET current_belt = v_to WHERE id = NEW.student_id AND current_belt IS DISTINCT FROM v_to;
    END IF;
  ELSE
    DELETE FROM student_grading_history WHERE grading_registration_id = NEW.id;
    IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.result,'')) IN ('pass','double') THEN
      o_from := v_from; o_to := v_to;
      IF lower(coalesce(NEW.result,'')) <> 'double' AND lower(OLD.result) = 'double' THEN o_to := coalesce(_next_belt(v_to), v_to); END IF;
      UPDATE students SET current_belt = o_from WHERE id = NEW.student_id AND current_belt IN (o_to, OLD.target_belt);
    END IF;
  END IF;
  RETURN NEW;
END $function$;

REVOKE EXECUTE ON FUNCTION public._grading_steps(uuid) FROM anon, public;

-- Repair every passed registration whose invoice holds multiple Foundation lines
UPDATE grading_registrations g SET result = g.result
WHERE lower(coalesce(g.result,'')) IN ('pass','double')
  AND EXISTS (SELECT 1 FROM invoice_items a JOIN invoice_items b ON b.invoice_id=a.invoice_id AND b.id<>a.id
              WHERE a.id=g.invoice_item_id AND a.description ILIKE 'Foundation % >> %' AND b.description ILIKE 'Foundation % >> %');