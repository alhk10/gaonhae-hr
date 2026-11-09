CREATE OR REPLACE FUNCTION public._grading_reg_sync_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_date date; v_branch text;
BEGIN
  SELECT gs.grading_date, COALESCE(NEW.branch_id::text, gs.branch_id::text) INTO v_date, v_branch
    FROM grading_slots gs WHERE gs.id = NEW.grading_slot_id;
  IF lower(coalesce(NEW.result,'')) IN ('pass','double') AND NEW.target_belt IS NOT NULL THEN
    INSERT INTO student_grading_history (student_id, belt_from, belt_to, grading_date, result, branch_id, grading_registration_id, notes)
    VALUES (NEW.student_id, NEW.current_belt, NEW.target_belt, coalesce(v_date, current_date), lower(NEW.result), v_branch, NEW.id, NEW.remark)
    ON CONFLICT (grading_registration_id) DO UPDATE SET
      student_id = EXCLUDED.student_id, belt_from = EXCLUDED.belt_from, belt_to = EXCLUDED.belt_to,
      grading_date = EXCLUDED.grading_date, result = EXCLUDED.result, branch_id = EXCLUDED.branch_id,
      notes = EXCLUDED.notes, updated_at = now();
    IF NOT EXISTS (
      SELECT 1 FROM grading_registrations g2 JOIN grading_slots s2 ON s2.id = g2.grading_slot_id
      WHERE g2.student_id = NEW.student_id AND g2.id <> NEW.id
        AND lower(coalesce(g2.result,'')) IN ('pass','double') AND s2.grading_date > coalesce(v_date, current_date)
    ) THEN
      UPDATE students SET current_belt = NEW.target_belt
        WHERE id = NEW.student_id AND current_belt IS DISTINCT FROM NEW.target_belt;
    END IF;
  ELSE
    DELETE FROM student_grading_history WHERE grading_registration_id = NEW.id;
    IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.result,'')) IN ('pass','double') AND OLD.target_belt IS NOT NULL THEN
      UPDATE students SET current_belt = OLD.current_belt
        WHERE id = NEW.student_id AND current_belt = OLD.target_belt;
    END IF;
  END IF;
  RETURN NEW;
END $$;

UPDATE public.students s SET current_belt = x.target_belt
FROM (
  SELECT DISTINCT ON (gr.student_id) gr.student_id, gr.current_belt, gr.target_belt
  FROM public.grading_registrations gr JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
  WHERE lower(coalesce(gr.result,'')) IN ('pass','double') AND gr.target_belt IS NOT NULL
  ORDER BY gr.student_id, gs.grading_date DESC
) x
WHERE s.id = x.student_id AND s.current_belt IS DISTINCT FROM x.target_belt
  AND (s.current_belt IS NULL OR s.current_belt ILIKE 'white' OR s.current_belt = x.current_belt);