DO $do$ DECLARE d text; o text; BEGIN
  d := pg_get_functiondef('public.admin_correct_submission_match(uuid,uuid,text)'::regprocedure);
  o := d;
  d := replace(d, $q$    UPDATE public.journal_lines jl SET contact_ref = p_new_student_id::text
      FROM public.journal_entries je
      WHERE jl.journal_id = je.id AND jl.contact_type = 'student' AND jl.contact_ref = v_current_student_id::text
        AND ((je.source_type = 'invoice' AND je.source_id = v_invoice_id::text)
          OR (je.source_type = 'payment' AND je.source_id IN (SELECT id::text FROM public.payments WHERE invoice_id = v_invoice_id)));
$q$, '');
  IF d = o THEN RAISE EXCEPTION 'patch failed: journal_lines block not found in admin_correct_submission_match'; END IF;
  EXECUTE d;
END $do$;