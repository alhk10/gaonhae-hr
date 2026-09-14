CREATE OR REPLACE FUNCTION public.admin_update_grading_registration_student(p_registration_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prev uuid;
  v_invoice uuid;
  v_sub uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  SELECT gr.student_id, i.id
    INTO v_prev, v_invoice
  FROM public.grading_registrations gr
  LEFT JOIN public.invoice_items ii ON ii.id = gr.invoice_item_id
  LEFT JOIN public.invoices i ON i.id = ii.invoice_id
  WHERE gr.id = p_registration_id;

  IF v_prev IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  UPDATE public.grading_registrations
  SET student_id = p_student_id
  WHERE id = p_registration_id;

  IF v_invoice IS NOT NULL THEN
    UPDATE public.invoices SET student_id = p_student_id WHERE id = v_invoice;

    UPDATE public.grading_payment_submissions
    SET matched_student_id = p_student_id, updated_at = now()
    WHERE matched_invoice_id = v_invoice
    RETURNING id INTO v_sub;
  END IF;

  INSERT INTO public.submission_match_events (scope, submission_id, student_id, previous_student_id, method, actor, note)
  VALUES ('grading', COALESCE(v_sub, p_registration_id), p_student_id, v_prev, 'manual', 'staff', 'Grading entry moved to another student');
END;
$function$;