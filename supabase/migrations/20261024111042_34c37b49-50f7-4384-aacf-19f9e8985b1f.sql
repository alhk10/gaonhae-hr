CREATE OR REPLACE FUNCTION public.prevent_duplicate_grading_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref text;
BEGIN
  IF NEW.matched_student_id IS NULL OR NEW.resolved_grading_slot_id IS NULL THEN RETURN NEW; END IF;
  IF coalesce(current_setting('app.allow_duplicate_grading', true), '') = 'on' THEN RETURN NEW; END IF;
  SELECT reference_number INTO v_ref FROM public.grading_payment_submissions
   WHERE matched_student_id = NEW.matched_student_id
     AND resolved_grading_slot_id = NEW.resolved_grading_slot_id
     AND status IN ('pending_verification','verified')
     AND id <> NEW.id
   LIMIT 1;
  IF v_ref IS NULL AND EXISTS (SELECT 1 FROM public.grading_registrations
       WHERE student_id = NEW.matched_student_id AND grading_slot_id = NEW.resolved_grading_slot_id) THEN
    v_ref := 'existing registration';
  END IF;
  IF v_ref IS NOT NULL THEN
    RAISE EXCEPTION 'Already paid for this grading (%). Duplicate payment not accepted.', v_ref USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_grading ON public.grading_payment_submissions;
CREATE TRIGGER trg_prevent_duplicate_grading BEFORE INSERT ON public.grading_payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_grading_submission();

CREATE OR REPLACE FUNCTION public.admin_convert_duplicate_grading_to_credit(p_id uuid, p_actor text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.grading_payment_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF s.status <> 'pending_verification' THEN RAISE EXCEPTION 'Only pending submissions can be converted'; END IF;
  IF s.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission is not matched to a student'; END IF;
  INSERT INTO public.student_credits(student_id, amount, type, description, created_by)
  VALUES (s.matched_student_id, s.amount, 'manual_adjustment',
          'Duplicate grading payment ' || coalesce(s.reference_number, s.id::text) || ' converted to credit', p_actor);
  UPDATE public.grading_payment_submissions
     SET status = 'rejected', remark = 'Duplicate payment — converted to student credit',
         reviewed_by = p_actor, reviewed_at = now(), updated_at = now()
   WHERE id = p_id;
  RETURN s.amount;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_convert_duplicate_grading_to_credit(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pending_grading_submission_meta()
RETURNS TABLE(id uuid, created_at timestamptz, reference_number text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, created_at, reference_number FROM public.grading_payment_submissions WHERE status = 'pending_verification'
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_grading_submission_meta() TO anon, authenticated;