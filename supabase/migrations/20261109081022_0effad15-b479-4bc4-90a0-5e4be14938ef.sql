CREATE OR REPLACE FUNCTION public._next_belt(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE lower(trim(coalesce(p,'')))
    WHEN 'foundation 1' THEN 'Foundation 2' WHEN 'foundation 2' THEN 'Foundation 3'
    WHEN 'foundation 3' THEN 'White' WHEN 'foundation' THEN 'White'
    WHEN 'white' THEN 'Yellow Tip' WHEN 'yellow tip' THEN 'Yellow' WHEN 'yellow' THEN 'Green Tip'
    WHEN 'green tip' THEN 'Green' WHEN 'green' THEN 'Blue Tip' WHEN 'blue tip' THEN 'Blue'
    WHEN 'blue' THEN 'Red Tip' WHEN 'red tip' THEN 'Red' WHEN 'red' THEN 'Black Tip'
    ELSE NULL END
$$;

-- Effective belts for a registration: invoice line "X >> Y" wins over booked belts; Double adds one more step.
CREATE OR REPLACE FUNCTION public._grading_effective_belts(p_reg_id uuid, OUT belt_from text, OUT belt_to text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public._grading_reg_sync_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_date date; v_branch text; v_from text; v_to text; o_from text; o_to text;
BEGIN
  SELECT gs.grading_date, COALESCE(NEW.branch_id::text, gs.branch_id::text) INTO v_date, v_branch
    FROM grading_slots gs WHERE gs.id = NEW.grading_slot_id;
  SELECT e.belt_from, e.belt_to INTO v_from, v_to FROM _grading_effective_belts(NEW.id) e;
  IF lower(coalesce(NEW.result,'')) IN ('pass','double') AND v_to IS NOT NULL THEN
    INSERT INTO student_grading_history (student_id, belt_from, belt_to, grading_date, result, branch_id, grading_registration_id, notes)
    VALUES (NEW.student_id, v_from, v_to, coalesce(v_date, current_date), lower(NEW.result), v_branch, NEW.id, NEW.remark)
    ON CONFLICT (grading_registration_id) DO UPDATE SET
      student_id = EXCLUDED.student_id, belt_from = EXCLUDED.belt_from, belt_to = EXCLUDED.belt_to,
      grading_date = EXCLUDED.grading_date, result = EXCLUDED.result, branch_id = EXCLUDED.branch_id,
      notes = EXCLUDED.notes, updated_at = now();
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
      -- what the old result produced: booked/invoice target, plus one step if it was a Double
      o_from := v_from; o_to := v_to;
      IF lower(coalesce(NEW.result,'')) <> 'double' AND lower(OLD.result) = 'double' THEN o_to := coalesce(_next_belt(v_to), v_to); END IF;
      UPDATE students SET current_belt = o_from WHERE id = NEW.student_id AND current_belt IN (o_to, OLD.target_belt);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS grading_reg_sync_history ON public.grading_registrations;
CREATE TRIGGER grading_reg_sync_history AFTER INSERT OR UPDATE OF result, current_belt, target_belt, grading_slot_id, invoice_item_id
  ON public.grading_registrations FOR EACH ROW EXECUTE FUNCTION public._grading_reg_sync_history();

-- Backfill history with effective belts
UPDATE public.student_grading_history h SET belt_from = e.belt_from, belt_to = e.belt_to, updated_at = now()
FROM public.grading_registrations r, LATERAL public._grading_effective_belts(r.id) e
WHERE h.grading_registration_id = r.id AND lower(coalesce(r.result,'')) IN ('pass','double')
  AND e.belt_to IS NOT NULL AND (h.belt_from IS DISTINCT FROM e.belt_from OR h.belt_to IS DISTINCT FROM e.belt_to);

-- Backfill belts from each student's latest pass, only where the belt still equals the start belt or the old booked target
UPDATE public.students s SET current_belt = x.belt_to
FROM (
  SELECT DISTINCT ON (gr.student_id) gr.student_id, gr.target_belt, e.belt_from, e.belt_to
  FROM public.grading_registrations gr JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  CROSS JOIN LATERAL public._grading_effective_belts(gr.id) e
  WHERE lower(coalesce(gr.result,'')) IN ('pass','double') AND e.belt_to IS NOT NULL
  ORDER BY gr.student_id, gs.grading_date DESC
) x
WHERE s.id = x.student_id AND s.current_belt IS DISTINCT FROM x.belt_to
  AND (s.current_belt IS NULL OR s.current_belt IN (x.belt_from, x.target_belt));

-- Yui Cheung: registration belts follow the invoice line
UPDATE public.grading_registrations SET current_belt = 'Red Tip', target_belt = 'Red' WHERE id = '2d561d16-8129-48d1-8865-bae33428ae02';

REVOKE ALL ON FUNCTION public._grading_effective_belts(uuid) FROM PUBLIC, anon, authenticated;