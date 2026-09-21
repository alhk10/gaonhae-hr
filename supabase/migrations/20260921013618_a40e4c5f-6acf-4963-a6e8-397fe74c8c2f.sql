CREATE OR REPLACE FUNCTION public.get_submission_match_event_detail(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ev public.submission_match_events%ROWTYPE;
  v_detail jsonb;
  v_branch_id text;
BEGIN
  SELECT * INTO ev FROM public.submission_match_events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match event not found'; END IF;

  CASE ev.scope
    WHEN 'grading' THEN
      SELECT jsonb_build_object(
        'reference', s.reference_number, 'submitted_name', trim(concat_ws(' ', s.first_name, s.last_name)),
        'date_of_birth', s.date_of_birth, 'email', s.email, 'phone', null,
        'branch_id', s.branch_id, 'amount', s.amount, 'payment_method', s.payment_method,
        'status', s.status, 'current_student_id', s.matched_student_id,
        'invoice_id', s.matched_invoice_id, 'submitted_at', s.created_at
      ), s.branch_id INTO v_detail, v_branch_id
      FROM public.grading_payment_submissions s WHERE s.id = ev.submission_id;
    WHEN 'competition' THEN
      SELECT jsonb_build_object(
        'reference', s.reference_number, 'submitted_name', trim(concat_ws(' ', s.first_name, s.last_name)),
        'date_of_birth', s.date_of_birth, 'email', s.email, 'phone', null,
        'branch_id', s.branch_id, 'amount', s.amount, 'payment_method', s.payment_method,
        'status', s.status, 'current_student_id', s.matched_student_id,
        'invoice_id', s.matched_invoice_id, 'submitted_at', s.created_at
      ), s.branch_id INTO v_detail, v_branch_id
      FROM public.competition_payment_submissions s WHERE s.id = ev.submission_id;
    WHEN 'seminar' THEN
      SELECT jsonb_build_object(
        'reference', s.reference_number, 'submitted_name', trim(concat_ws(' ', s.first_name, s.last_name)),
        'date_of_birth', s.date_of_birth, 'email', s.email, 'phone', null,
        'branch_id', s.branch_id, 'amount', s.amount, 'payment_method', s.payment_method,
        'status', s.status, 'current_student_id', s.matched_student_id,
        'invoice_id', s.matched_invoice_id, 'submitted_at', s.created_at
      ), s.branch_id INTO v_detail, v_branch_id
      FROM public.seminar_payment_submissions s WHERE s.id = ev.submission_id;
    WHEN 'guards' THEN
      SELECT jsonb_build_object(
        'reference', s.reference_number, 'submitted_name', trim(concat_ws(' ', s.first_name, s.last_name)),
        'date_of_birth', s.date_of_birth, 'email', s.email, 'phone', s.phone,
        'branch_id', s.branch_id, 'amount', s.total, 'payment_method', s.payment_method,
        'status', s.sale_status, 'current_student_id', s.matched_student_id,
        'invoice_id', s.invoice_id, 'submitted_at', s.created_at
      ), s.branch_id INTO v_detail, v_branch_id
      FROM public.guards_purchases s WHERE s.id = ev.submission_id;
    WHEN 'school_fees' THEN
      SELECT jsonb_build_object(
        'reference', s.reference_number,
        'submitted_name', trim(concat_ws(' ', cs.first_name, cs.last_name)),
        'date_of_birth', cs.date_of_birth, 'email', cs.email, 'phone', cs.phone,
        'branch_id', s.branch_id, 'amount', s.amount, 'payment_method', s.payment_method,
        'status', s.status, 'current_student_id', s.matched_student_id,
        'invoice_id', s.matched_invoice_id, 'submitted_at', s.created_at
      ), s.branch_id INTO v_detail, v_branch_id
      FROM public.public_chat_payment_submissions s
      LEFT JOIN public.public_chat_sessions cs ON cs.id = s.session_id
      WHERE s.id = ev.submission_id;
    ELSE
      RAISE EXCEPTION 'Unsupported match scope: %', ev.scope;
  END CASE;

  IF v_detail IS NULL THEN RAISE EXCEPTION 'Submission no longer exists'; END IF;
  IF public.get_current_user_role() <> 'superadmin' AND NOT public.has_branch_access(v_branch_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN v_detail || jsonb_build_object(
    'branch_name', (SELECT b.name FROM public.branches b WHERE b.id = v_branch_id),
    'invoice_number', (SELECT i.invoice_number FROM public.invoices i WHERE i.id = (v_detail->>'invoice_id')::uuid),
    'can_correct', public.get_current_user_role() = 'superadmin'
      AND (v_detail->>'current_student_id')::uuid IS NOT DISTINCT FROM ev.student_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_submission_match_event_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_submission_match_event_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_submission_match_event_detail(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_correct_submission_match(
  p_event_id uuid,
  p_new_student_id uuid DEFAULT NULL,
  p_actor text DEFAULT 'superadmin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ev public.submission_match_events%ROWTYPE;
  v_current_student_id uuid;
  v_invoice_id uuid;
  v_branch_id text;
  v_reference text;
  v_invoice_number text;
  v_scope text;
BEGIN
  IF public.get_current_user_role() <> 'superadmin' THEN RAISE EXCEPTION 'Superadmin access required'; END IF;
  SELECT * INTO ev FROM public.submission_match_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match event not found'; END IF;
  v_scope := ev.scope;

  IF p_new_student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_new_student_id) THEN
    RAISE EXCEPTION 'Replacement student not found';
  END IF;

  CASE v_scope
    WHEN 'grading' THEN
      SELECT matched_student_id, matched_invoice_id, branch_id, reference_number
      INTO v_current_student_id, v_invoice_id, v_branch_id, v_reference
      FROM public.grading_payment_submissions WHERE id = ev.submission_id FOR UPDATE;
    WHEN 'competition' THEN
      SELECT matched_student_id, matched_invoice_id, branch_id, reference_number
      INTO v_current_student_id, v_invoice_id, v_branch_id, v_reference
      FROM public.competition_payment_submissions WHERE id = ev.submission_id FOR UPDATE;
    WHEN 'seminar' THEN
      SELECT matched_student_id, matched_invoice_id, branch_id, reference_number
      INTO v_current_student_id, v_invoice_id, v_branch_id, v_reference
      FROM public.seminar_payment_submissions WHERE id = ev.submission_id FOR UPDATE;
    WHEN 'guards' THEN
      SELECT matched_student_id, invoice_id, branch_id, reference_number
      INTO v_current_student_id, v_invoice_id, v_branch_id, v_reference
      FROM public.guards_purchases WHERE id = ev.submission_id FOR UPDATE;
    WHEN 'school_fees' THEN
      SELECT matched_student_id, matched_invoice_id, branch_id, reference_number
      INTO v_current_student_id, v_invoice_id, v_branch_id, v_reference
      FROM public.public_chat_payment_submissions WHERE id = ev.submission_id FOR UPDATE;
    ELSE
      RAISE EXCEPTION 'Unsupported match scope: %', v_scope;
  END CASE;

  IF v_current_student_id IS NULL THEN RAISE EXCEPTION 'Submission is already unmatched'; END IF;
  IF v_current_student_id IS DISTINCT FROM ev.student_id THEN
    RAISE EXCEPTION 'This history entry is not the current match';
  END IF;
  IF v_invoice_id IS NOT NULL AND p_new_student_id IS NULL THEN
    RAISE EXCEPTION 'Choose the correct student because invoice % already exists', v_invoice_id;
  END IF;
  IF p_new_student_id IS NOT NULL AND p_new_student_id = v_current_student_id THEN
    RAISE EXCEPTION 'Choose a different student';
  END IF;

  CASE v_scope
    WHEN 'grading' THEN UPDATE public.grading_payment_submissions SET matched_student_id = p_new_student_id, updated_at = now() WHERE id = ev.submission_id;
    WHEN 'competition' THEN UPDATE public.competition_payment_submissions SET matched_student_id = p_new_student_id, updated_at = now() WHERE id = ev.submission_id;
    WHEN 'seminar' THEN UPDATE public.seminar_payment_submissions SET matched_student_id = p_new_student_id, updated_at = now() WHERE id = ev.submission_id;
    WHEN 'guards' THEN UPDATE public.guards_purchases SET matched_student_id = p_new_student_id, updated_at = now() WHERE id = ev.submission_id;
    WHEN 'school_fees' THEN UPDATE public.public_chat_payment_submissions SET matched_student_id = p_new_student_id WHERE id = ev.submission_id;
  END CASE;

  IF v_invoice_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = v_invoice_id AND student_id = v_current_student_id) THEN
      RAISE EXCEPTION 'Invoice ownership no longer matches this submission';
    END IF;
    SELECT invoice_number INTO v_invoice_number FROM public.invoices WHERE id = v_invoice_id;
    UPDATE public.invoices SET student_id = p_new_student_id, updated_at = now(), updated_by = p_actor WHERE id = v_invoice_id;
    UPDATE public.grading_registrations gr SET student_id = p_new_student_id
      FROM public.invoice_items ii WHERE gr.invoice_item_id = ii.id AND ii.invoice_id = v_invoice_id;
    UPDATE public.student_class_enrollments e SET student_id = p_new_student_id, updated_at = now()
      FROM public.invoice_items ii WHERE e.invoice_item_id = ii.id AND ii.invoice_id = v_invoice_id;
    UPDATE public.entitlements e SET student_id = p_new_student_id, updated_at = now()
      WHERE e.source_type = 'invoice_item' AND e.source_id IN (SELECT id FROM public.invoice_items WHERE invoice_id = v_invoice_id);
    UPDATE public.journal_lines jl SET contact_ref = p_new_student_id::text
      FROM public.journal_entries je
      WHERE jl.journal_id = je.id AND jl.contact_type = 'student' AND jl.contact_ref = v_current_student_id::text
        AND ((je.source_type = 'invoice' AND je.source_id = v_invoice_id::text)
          OR (je.source_type = 'payment' AND je.source_id IN (SELECT id::text FROM public.payments WHERE invoice_id = v_invoice_id)));
    INSERT INTO public.invoice_change_logs (invoice_id, action, field_name, old_value, new_value, changed_by, changed_by_email, changes)
    VALUES (v_invoice_id, 'student_reassigned', 'student_id', v_current_student_id::text, p_new_student_id::text,
      p_actor, auth.email(), jsonb_build_object('source', 'match_history', 'scope', v_scope, 'submission_id', ev.submission_id));
  END IF;

  INSERT INTO public.submission_match_events
    (scope, submission_id, student_id, previous_student_id, method, actor, note)
  VALUES
    (v_scope, ev.submission_id, p_new_student_id, v_current_student_id, 'manual', p_actor,
      CASE WHEN p_new_student_id IS NULL THEN 'Match undone'
           ELSE format('Match corrected; invoice %s moved', COALESCE(v_invoice_number, 'not created')) END);

  RETURN jsonb_build_object(
    'scope', v_scope, 'submission_id', ev.submission_id, 'previous_student_id', v_current_student_id,
    'student_id', p_new_student_id, 'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number,
    'reference', v_reference
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_correct_submission_match(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_correct_submission_match(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_correct_submission_match(uuid, uuid, text) TO service_role;