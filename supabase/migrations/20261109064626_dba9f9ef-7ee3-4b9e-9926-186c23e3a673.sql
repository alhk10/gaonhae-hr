ALTER TABLE public.student_grading_history ADD COLUMN IF NOT EXISTS grading_registration_id uuid UNIQUE REFERENCES public.grading_registrations(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public._grading_reg_sync_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_date date; v_branch text;
BEGIN
  IF lower(coalesce(NEW.result,'')) IN ('pass','double') AND NEW.target_belt IS NOT NULL THEN
    SELECT gs.grading_date, COALESCE(NEW.branch_id::text, gs.branch_id::text) INTO v_date, v_branch
      FROM grading_slots gs WHERE gs.id = NEW.grading_slot_id;
    INSERT INTO student_grading_history (student_id, belt_from, belt_to, grading_date, result, branch_id, grading_registration_id, notes)
    VALUES (NEW.student_id, NEW.current_belt, NEW.target_belt, coalesce(v_date, current_date), lower(NEW.result), v_branch, NEW.id, NEW.remark)
    ON CONFLICT (grading_registration_id) DO UPDATE SET
      student_id = EXCLUDED.student_id, belt_from = EXCLUDED.belt_from, belt_to = EXCLUDED.belt_to,
      grading_date = EXCLUDED.grading_date, result = EXCLUDED.result, branch_id = EXCLUDED.branch_id,
      notes = EXCLUDED.notes, updated_at = now();
  ELSE
    DELETE FROM student_grading_history WHERE grading_registration_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public._grading_reg_sync_history() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS grading_reg_sync_history ON public.grading_registrations;
CREATE TRIGGER grading_reg_sync_history AFTER INSERT OR UPDATE OF result, current_belt, target_belt, grading_slot_id ON public.grading_registrations
FOR EACH ROW EXECUTE FUNCTION public._grading_reg_sync_history();

INSERT INTO public.student_grading_history (student_id, belt_from, belt_to, grading_date, result, branch_id, grading_registration_id, notes)
SELECT gr.student_id, gr.current_belt, gr.target_belt, gs.grading_date, lower(gr.result), COALESCE(gr.branch_id::text, gs.branch_id::text), gr.id, gr.remark
FROM public.grading_registrations gr JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
WHERE lower(coalesce(gr.result,'')) IN ('pass','double') AND gr.target_belt IS NOT NULL
ON CONFLICT (grading_registration_id) DO NOTHING;