
-- Duplicate student detection & merge RPCs (superadmin only)

CREATE OR REPLACE FUNCTION public.find_duplicate_students(p_criteria jsonb DEFAULT '{"name":true,"phone":true,"email":true,"dob_name":true}'::jsonb)
RETURNS TABLE(group_key text, match_reason text, student_id uuid, last_activity_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can run duplicate detection';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT s.id,
           upper(trim(coalesce(s.first_name,''))) || ' ' || upper(trim(coalesce(s.last_name,''))) AS norm_name,
           right(regexp_replace(coalesce(s.phone,''), '\D', '', 'g'), 8) AS norm_phone,
           lower(trim(coalesce(s.email,''))) AS norm_email,
           s.date_of_birth,
           greatest(
             s.updated_at,
             coalesce((SELECT max(i.updated_at) FROM invoices i WHERE i.student_id = s.id), s.created_at),
             coalesce((SELECT max(ca.attendance_date)::timestamptz FROM class_attendance ca WHERE ca.student_id = s.id), s.created_at),
             coalesce((SELECT max(e.updated_at) FROM student_class_enrollments e WHERE e.student_id = s.id), s.created_at),
             coalesce((SELECT max(g.updated_at) FROM grading_registrations g WHERE g.student_id = s.id), s.created_at)
           ) AS last_act
    FROM students s
  ),
  name_groups AS (
    SELECT 'name:'||norm_name AS gk, 'name' AS reason, b.id, b.last_act
    FROM base b
    WHERE (p_criteria->>'name')::boolean = true AND length(trim(norm_name)) > 1
      AND norm_name IN (SELECT norm_name FROM base GROUP BY norm_name HAVING count(*) > 1)
  ),
  phone_groups AS (
    SELECT 'phone:'||norm_phone AS gk, 'phone' AS reason, b.id, b.last_act
    FROM base b
    WHERE (p_criteria->>'phone')::boolean = true AND length(norm_phone) = 8
      AND norm_phone IN (SELECT norm_phone FROM base WHERE length(norm_phone)=8 GROUP BY norm_phone HAVING count(*) > 1)
  ),
  email_groups AS (
    SELECT 'email:'||norm_email AS gk, 'email' AS reason, b.id, b.last_act
    FROM base b
    WHERE (p_criteria->>'email')::boolean = true AND norm_email <> ''
      AND norm_email IN (SELECT norm_email FROM base WHERE norm_email<>'' GROUP BY norm_email HAVING count(*) > 1)
  ),
  dob_groups AS (
    SELECT 'dob:'||date_of_birth::text||'|'||norm_name AS gk, 'dob_name' AS reason, b.id, b.last_act
    FROM base b
    WHERE (p_criteria->>'dob_name')::boolean = true AND date_of_birth IS NOT NULL AND length(trim(norm_name))>1
      AND (date_of_birth, norm_name) IN (SELECT date_of_birth, norm_name FROM base WHERE date_of_birth IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1)
  )
  SELECT gk, reason, id, last_act FROM name_groups
  UNION ALL SELECT gk, reason, id, last_act FROM phone_groups
  UNION ALL SELECT gk, reason, id, last_act FROM email_groups
  UNION ALL SELECT gk, reason, id, last_act FROM dob_groups;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_duplicate_students(jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.merge_students(p_keep_id uuid, p_drop_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts jsonb := '{}'::jsonb;
  v_n int;
  v_keep students%ROWTYPE;
  v_drop students%ROWTYPE;
  v_field text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can merge students';
  END IF;

  IF p_keep_id IS NULL OR p_drop_ids IS NULL OR array_length(p_drop_ids,1) IS NULL THEN
    RAISE EXCEPTION 'keep_id and drop_ids are required';
  END IF;

  IF p_keep_id = ANY(p_drop_ids) THEN
    RAISE EXCEPTION 'keep_id cannot be in drop_ids';
  END IF;

  SELECT * INTO v_keep FROM students WHERE id = p_keep_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'keep student not found'; END IF;

  -- Pre-delete unique-collision rows on the drop side
  DELETE FROM student_auth WHERE student_id = ANY(p_drop_ids)
    AND EXISTS (SELECT 1 FROM student_auth k WHERE k.student_id = p_keep_id);

  DELETE FROM student_medical_notes WHERE student_id = ANY(p_drop_ids)
    AND EXISTS (SELECT 1 FROM student_medical_notes k WHERE k.student_id = p_keep_id);

  DELETE FROM grading_registrations d
    WHERE d.student_id = ANY(p_drop_ids)
      AND EXISTS (SELECT 1 FROM grading_registrations k
                  WHERE k.student_id = p_keep_id
                    AND (k.grading_slot_id = d.grading_slot_id OR k.term_id = d.term_id));

  DELETE FROM student_notification_subscriptions d
    WHERE d.student_id = ANY(p_drop_ids)
      AND EXISTS (SELECT 1 FROM student_notification_subscriptions k
                  WHERE k.student_id = p_keep_id AND k.endpoint = d.endpoint);

  -- Re-point related records
  UPDATE invoices SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invoices', v_n);

  UPDATE class_attendance SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('class_attendance', v_n);

  UPDATE student_class_enrollments SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('enrollments', v_n);

  UPDATE entitlements SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('entitlements', v_n);

  UPDATE grading_registrations SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('grading_registrations', v_n);

  UPDATE student_grading_history SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('grading_history', v_n);

  UPDATE grading_deletion_requests SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_credits SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('credits', v_n);

  UPDATE student_emergency_contacts SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_medical_notes SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_notification_subscriptions SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_update_requests SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_withdrawal_requests SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_branch_chats SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_change_logs SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);
  UPDATE student_auth SET student_id = p_keep_id WHERE student_id = ANY(p_drop_ids);

  -- Re-point submission-side matched references
  UPDATE competition_payment_submissions SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);
  UPDATE grading_payment_submissions SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);
  UPDATE seminar_payment_submissions SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);
  UPDATE guards_purchases SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);
  UPDATE public_chat_callback_requests SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);
  UPDATE public_chat_callback_requests SET created_student_id = p_keep_id WHERE created_student_id = ANY(p_drop_ids);
  UPDATE public_chat_payment_submissions SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);
  UPDATE public_chat_sessions SET matched_student_id = p_keep_id WHERE matched_student_id = ANY(p_drop_ids);

  -- Documents (polymorphic link)
  UPDATE documents SET linked_id = p_keep_id
    WHERE linked_type = 'student' AND linked_id::uuid = ANY(p_drop_ids);

  -- Merge profile: fill kept student's null/empty fields with newest non-null from drops
  FOR v_drop IN
    SELECT * FROM students WHERE id = ANY(p_drop_ids) ORDER BY updated_at DESC
  LOOP
    UPDATE students SET
      last_name                       = coalesce(nullif(trim(coalesce(last_name,'')),''), v_drop.last_name),
      email                           = coalesce(nullif(trim(coalesce(email,'')),''), v_drop.email),
      phone                           = coalesce(nullif(trim(coalesce(phone,'')),''), v_drop.phone),
      whatsapp                        = coalesce(whatsapp, v_drop.whatsapp),
      date_of_birth                   = coalesce(date_of_birth, v_drop.date_of_birth),
      gender                          = coalesce(gender, v_drop.gender),
      address                         = coalesce(nullif(trim(coalesce(address,'')),''), v_drop.address),
      postal_code                     = coalesce(nullif(trim(coalesce(postal_code,'')),''), v_drop.postal_code),
      emergency_contact_name          = coalesce(emergency_contact_name, v_drop.emergency_contact_name),
      emergency_contact_phone         = coalesce(emergency_contact_phone, v_drop.emergency_contact_phone),
      emergency_contact_relationship  = coalesce(emergency_contact_relationship, v_drop.emergency_contact_relationship),
      emergency_contact_2_name        = coalesce(emergency_contact_2_name, v_drop.emergency_contact_2_name),
      emergency_contact_2_phone       = coalesce(emergency_contact_2_phone, v_drop.emergency_contact_2_phone),
      emergency_contact_2_relationship= coalesce(emergency_contact_2_relationship, v_drop.emergency_contact_2_relationship),
      current_belt                    = coalesce(current_belt, v_drop.current_belt),
      branch_id                       = coalesce(branch_id, v_drop.branch_id),
      enrollment_date                 = coalesce(enrollment_date, v_drop.enrollment_date),
      registered_date                 = coalesce(registered_date, v_drop.registered_date),
      nric_passport                   = coalesce(nric_passport, v_drop.nric_passport),
      passport_no                     = coalesce(passport_no, v_drop.passport_no),
      passport_photo_url              = coalesce(passport_photo_url, v_drop.passport_photo_url),
      preferred_name                  = coalesce(preferred_name, v_drop.preferred_name),
      display_name                    = coalesce(display_name, v_drop.display_name),
      certificate_name                = coalesce(certificate_name, v_drop.certificate_name),
      previous_experience             = coalesce(previous_experience, v_drop.previous_experience),
      training_goals                  = coalesce(training_goals, v_drop.training_goals),
      medical_conditions              = coalesce(medical_conditions, v_drop.medical_conditions),
      dietary_restrictions            = coalesce(dietary_restrictions, v_drop.dietary_restrictions),
      referral_source                 = coalesce(referral_source, v_drop.referral_source),
      trial_date                      = coalesce(trial_date, v_drop.trial_date),
      trial_time                      = coalesce(trial_time, v_drop.trial_time),
      nationality                     = coalesce(nationality, v_drop.nationality),
      languages_spoken                = coalesce(languages_spoken, v_drop.languages_spoken),
      allowed_class_types             = coalesce(allowed_class_types, v_drop.allowed_class_types),
      notes                           = nullif(trim(concat_ws(E'\n---\n', nullif(trim(coalesce(notes,'')),''), nullif(trim(coalesce(v_drop.notes,'')),''))), ''),
      updated_at                      = now()
    WHERE id = p_keep_id;

    -- Audit log
    INSERT INTO student_change_logs (student_id, change_type, changed_fields, changed_by, created_at)
    VALUES (p_keep_id, 'merge',
            jsonb_build_object('merged_from', v_drop.id, 'merged_student_number', v_drop.student_number, 'merged_name', v_drop.first_name||' '||coalesce(v_drop.last_name,'')),
            coalesce(auth.uid()::text, 'system'), now());
  END LOOP;

  -- Re-uppercase names per data integrity rule
  UPDATE students SET
    first_name = upper(first_name),
    last_name  = upper(last_name)
  WHERE id = p_keep_id;

  -- Finally drop the duplicates
  DELETE FROM students WHERE id = ANY(p_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('deleted_students', v_n);

  RETURN v_counts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_students(uuid, uuid[]) TO authenticated;
