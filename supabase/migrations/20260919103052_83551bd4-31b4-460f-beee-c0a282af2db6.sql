
CREATE TABLE IF NOT EXISTS public.student_merge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keep_id uuid NOT NULL,
  drop_ids uuid[] NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by text NOT NULL DEFAULT 'access',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  merge_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.student_merge_requests TO authenticated;
GRANT ALL ON public.student_merge_requests TO service_role;

ALTER TABLE public.student_merge_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view merge requests" ON public.student_merge_requests;
CREATE POLICY "Authenticated can view merge requests"
  ON public.student_merge_requests FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_student_merge_requests_status
  ON public.student_merge_requests (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_student_merge_requests_updated_at ON public.student_merge_requests;
CREATE TRIGGER trg_student_merge_requests_updated_at
  BEFORE UPDATE ON public.student_merge_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------- add student
CREATE OR REPLACE FUNCTION public.admin_create_student_public(
  p_first_name text,
  p_last_name text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_branch_id text DEFAULT NULL,
  p_current_belt text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_actor text DEFAULT 'access',
  p_force boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first text := upper(btrim(coalesce(p_first_name,'')));
  v_last  text := upper(btrim(coalesce(p_last_name,'')));
  v_email text := nullif(lower(btrim(coalesce(p_email,''))),'');
  v_phone text := nullif(btrim(coalesce(p_phone,'')),'');
  v_gender text := nullif(lower(btrim(coalesce(p_gender,''))),'');
  v_status text := lower(btrim(coalesce(p_status,'active')));
  v_dup uuid;
  v_id uuid;
BEGIN
  IF v_first = '' THEN RAISE EXCEPTION 'First name is required'; END IF;
  IF p_branch_id IS NULL OR btrim(p_branch_id) = '' THEN RAISE EXCEPTION 'Branch is required'; END IF;
  IF v_status NOT IN ('active','inactive','trial') THEN
    RAISE EXCEPTION 'Invalid status: %. Use active, inactive or trial.', p_status;
  END IF;
  IF v_gender IS NOT NULL AND v_gender NOT IN ('male','female','other') THEN
    RAISE EXCEPTION 'Invalid gender: %', p_gender;
  END IF;
  IF v_email IS NOT NULL AND public.is_blocked_public_email(v_email) THEN
    RAISE EXCEPTION 'Please use a personal email address, not a school address.';
  END IF;

  SELECT s.id INTO v_dup
  FROM public.students s
  WHERE upper(coalesce(s.first_name,'')) = v_first
    AND upper(coalesce(s.last_name,'')) = v_last
    AND (p_date_of_birth IS NULL OR s.date_of_birth = p_date_of_birth)
  LIMIT 1;

  IF v_dup IS NOT NULL AND NOT p_force THEN
    RAISE EXCEPTION 'DUPLICATE_STUDENT: a student with this name% already exists',
      CASE WHEN p_date_of_birth IS NULL THEN '' ELSE ' and birth date' END;
  END IF;

  INSERT INTO public.students (
    student_number, first_name, last_name, display_name, certificate_name,
    date_of_birth, gender, email, phone, branch_id, current_belt, status,
    created_by, updated_by
  ) VALUES (
    public.generate_student_number(), v_first, v_last,
    btrim(v_first || ' ' || v_last), btrim(v_first || ' ' || v_last),
    p_date_of_birth, v_gender, v_email, v_phone, btrim(p_branch_id),
    nullif(btrim(coalesce(p_current_belt,'')),''), v_status,
    p_actor, p_actor
  ) RETURNING id INTO v_id;

  INSERT INTO public.student_change_logs (student_id, action, changes, changed_by)
  VALUES (v_id, 'create',
          jsonb_build_object('source','access_students_tab','name', btrim(v_first||' '||v_last)),
          p_actor);

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_create_student_public(text,text,date,text,text,text,text,text,text,text,boolean)
  TO anon, authenticated, service_role;

-- ------------------------------------------------------ public duplicate scan
CREATE OR REPLACE FUNCTION public.public_find_duplicate_students(
  p_criteria jsonb DEFAULT '{"name": true, "email": true, "phone": true, "dob_name": true}'::jsonb
)
RETURNS TABLE(
  group_key text,
  match_reason text,
  student_id uuid,
  last_activity_at timestamptz,
  student_number text,
  first_name text,
  last_name text,
  email text,
  phone text,
  date_of_birth date,
  current_belt text,
  branch_id text,
  status text,
  invoices_count int,
  enrollments_count int,
  attendance_count int,
  grading_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT s.id,
           upper(trim(coalesce(s.first_name,''))) || ' ' || upper(trim(coalesce(s.last_name,''))) AS norm_name,
           right(regexp_replace(coalesce(s.phone,''), '\D', '', 'g'), 8) AS norm_phone,
           lower(trim(coalesce(s.email,''))) AS norm_email,
           s.date_of_birth AS dob,
           greatest(
             s.updated_at,
             coalesce((SELECT max(i.updated_at) FROM invoices i WHERE i.student_id = s.id), s.created_at),
             coalesce((SELECT max(ca.attendance_date)::timestamptz FROM class_attendance ca WHERE ca.student_id = s.id), s.created_at),
             coalesce((SELECT max(e.updated_at) FROM student_class_enrollments e WHERE e.student_id = s.id), s.created_at),
             coalesce((SELECT max(g.updated_at) FROM grading_registrations g WHERE g.student_id = s.id), s.created_at)
           ) AS last_act
    FROM students s
  ),
  grouped AS (
    SELECT 'name:'||b.norm_name AS gk, 'name' AS reason, b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'name')::boolean,false) AND length(trim(b.norm_name)) > 1
      AND b.norm_name IN (SELECT norm_name FROM base GROUP BY norm_name HAVING count(*) > 1)
    UNION ALL
    SELECT 'phone:'||b.norm_phone, 'phone', b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'phone')::boolean,false) AND length(b.norm_phone) = 8
      AND b.norm_phone IN (SELECT norm_phone FROM base WHERE length(norm_phone)=8 GROUP BY norm_phone HAVING count(*) > 1)
    UNION ALL
    SELECT 'email:'||b.norm_email, 'email', b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'email')::boolean,false) AND b.norm_email <> ''
      AND b.norm_email IN (SELECT norm_email FROM base WHERE norm_email<>'' GROUP BY norm_email HAVING count(*) > 1)
    UNION ALL
    SELECT 'dob:'||b.dob::text||'|'||b.norm_name, 'dob_name', b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'dob_name')::boolean,false) AND b.dob IS NOT NULL AND length(trim(b.norm_name))>1
      AND (b.dob, b.norm_name) IN (SELECT dob, norm_name FROM base WHERE dob IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1)
  )
  SELECT g.gk, g.reason, g.id, g.last_act,
         s.student_number, s.first_name, s.last_name, s.email, s.phone,
         s.date_of_birth, s.current_belt, s.branch_id, s.status,
         (SELECT count(*)::int FROM invoices i WHERE i.student_id = s.id),
         (SELECT count(*)::int FROM student_class_enrollments e WHERE e.student_id = s.id),
         (SELECT count(*)::int FROM class_attendance ca WHERE ca.student_id = s.id),
         (SELECT count(*)::int FROM grading_registrations gr WHERE gr.student_id = s.id)
  FROM grouped g
  JOIN students s ON s.id = g.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.public_find_duplicate_students(jsonb) TO anon, authenticated, service_role;

-- --------------------------------------------------------- request the merge
CREATE OR REPLACE FUNCTION public.public_request_student_merge(
  p_keep_id uuid,
  p_drop_ids uuid[],
  p_actor text DEFAULT 'access',
  p_snapshot jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_keep_id IS NULL OR p_drop_ids IS NULL OR array_length(p_drop_ids,1) IS NULL THEN
    RAISE EXCEPTION 'Select a record to keep and at least one to remove';
  END IF;
  IF p_keep_id = ANY(p_drop_ids) THEN
    RAISE EXCEPTION 'The kept record cannot also be removed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_keep_id) THEN
    RAISE EXCEPTION 'Student to keep not found';
  END IF;
  IF (SELECT count(*) FROM students WHERE id = ANY(p_drop_ids)) <> array_length(p_drop_ids,1) THEN
    RAISE EXCEPTION 'One or more records to remove no longer exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM student_merge_requests r
    WHERE r.status = 'pending'
      AND (r.keep_id = p_keep_id OR r.keep_id = ANY(p_drop_ids)
           OR r.drop_ids && p_drop_ids OR p_keep_id = ANY(r.drop_ids))
  ) THEN
    RAISE EXCEPTION 'A merge request for one of these records is already pending approval';
  END IF;

  INSERT INTO student_merge_requests (keep_id, drop_ids, snapshot, requested_by)
  VALUES (p_keep_id, p_drop_ids, coalesce(p_snapshot,'{}'::jsonb), coalesce(nullif(btrim(p_actor),''),'access'))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.public_request_student_merge(uuid, uuid[], text, jsonb) TO anon, authenticated, service_role;

-- ------------------------------------------------ superadmin approve / reject
CREATE OR REPLACE FUNCTION public.approve_student_merge_request(
  p_request_id uuid,
  p_actor text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req student_merge_requests%ROWTYPE;
  v_counts jsonb := '{}'::jsonb;
  v_n int;
  v_drop students%ROWTYPE;
  v_keep_id uuid;
  v_drop_ids uuid[];
BEGIN
  IF NOT public.is_superadmin(p_actor) THEN
    RAISE EXCEPTION 'Only superadmins can approve student merges';
  END IF;

  SELECT * INTO v_req FROM student_merge_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Merge request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been reviewed'; END IF;

  v_keep_id := v_req.keep_id;
  v_drop_ids := v_req.drop_ids;

  IF NOT EXISTS (SELECT 1 FROM students WHERE id = v_keep_id) THEN
    RAISE EXCEPTION 'Student to keep no longer exists';
  END IF;

  DELETE FROM student_auth WHERE student_id = ANY(v_drop_ids)
    AND EXISTS (SELECT 1 FROM student_auth k WHERE k.student_id = v_keep_id);

  DELETE FROM student_medical_notes WHERE student_id = ANY(v_drop_ids)
    AND EXISTS (SELECT 1 FROM student_medical_notes k WHERE k.student_id = v_keep_id);

  DELETE FROM grading_registrations d
    WHERE d.student_id = ANY(v_drop_ids)
      AND EXISTS (SELECT 1 FROM grading_registrations k
                  WHERE k.student_id = v_keep_id
                    AND (k.grading_slot_id = d.grading_slot_id OR k.term_id = d.term_id));

  DELETE FROM student_notification_subscriptions d
    WHERE d.student_id = ANY(v_drop_ids)
      AND EXISTS (SELECT 1 FROM student_notification_subscriptions k
                  WHERE k.student_id = v_keep_id AND k.endpoint = d.endpoint);

  UPDATE invoices SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invoices', v_n);

  UPDATE class_attendance SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('class_attendance', v_n);

  UPDATE student_class_enrollments SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('enrollments', v_n);

  UPDATE entitlements SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('entitlements', v_n);

  UPDATE grading_registrations SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('grading_registrations', v_n);

  UPDATE student_grading_history SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE grading_deletion_requests SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);

  UPDATE student_credits SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('credits', v_n);

  UPDATE student_emergency_contacts SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_medical_notes SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_notification_subscriptions SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_update_requests SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_withdrawal_requests SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_branch_chats SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_change_logs SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_auth SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);
  UPDATE student_scheduled_classes SET student_id = v_keep_id WHERE student_id = ANY(v_drop_ids);

  UPDATE competition_payment_submissions SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);
  UPDATE grading_payment_submissions SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);
  UPDATE seminar_payment_submissions SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);
  UPDATE guards_purchases SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);
  UPDATE public_chat_callback_requests SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);
  UPDATE public_chat_callback_requests SET created_student_id = v_keep_id WHERE created_student_id = ANY(v_drop_ids);
  UPDATE public_chat_payment_submissions SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);
  UPDATE public_chat_sessions SET matched_student_id = v_keep_id WHERE matched_student_id = ANY(v_drop_ids);

  UPDATE documents SET linked_id = v_keep_id::text
    WHERE linked_type = 'student' AND linked_id = ANY(SELECT unnest(v_drop_ids)::text);

  FOR v_drop IN SELECT * FROM students WHERE id = ANY(v_drop_ids) ORDER BY updated_at DESC
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
    WHERE id = v_keep_id;

    INSERT INTO student_change_logs (student_id, action, changes, changed_by, created_at)
    VALUES (v_keep_id, 'merge',
            jsonb_build_object('merged_from', v_drop.id, 'merged_student_number', v_drop.student_number,
                               'merged_name', v_drop.first_name||' '||coalesce(v_drop.last_name,'')),
            p_actor, now());
  END LOOP;

  UPDATE students SET first_name = upper(first_name), last_name = upper(last_name) WHERE id = v_keep_id;

  DELETE FROM students WHERE id = ANY(v_drop_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('deleted_students', v_n);

  UPDATE student_merge_requests
  SET status = 'approved', reviewed_by = p_actor, reviewed_at = now(), merge_result = v_counts, updated_at = now()
  WHERE id = p_request_id;

  RETURN v_counts;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.approve_student_merge_request(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_student_merge_request(
  p_request_id uuid,
  p_actor text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_superadmin(p_actor) THEN
    RAISE EXCEPTION 'Only superadmins can reject student merges';
  END IF;

  UPDATE student_merge_requests
  SET status = 'rejected', reviewed_by = p_actor, reviewed_at = now(),
      rejection_reason = nullif(btrim(coalesce(p_reason,'')),''), updated_at = now()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merge request not found or already reviewed';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reject_student_merge_request(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_pending_student_merge_requests()
RETURNS SETOF public.student_merge_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.student_merge_requests WHERE status = 'pending' ORDER BY created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.list_pending_student_merge_requests() TO anon, authenticated, service_role;
