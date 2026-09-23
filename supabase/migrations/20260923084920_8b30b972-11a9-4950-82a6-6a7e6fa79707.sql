
-- List pending approvals (new students + detail change requests)
CREATE OR REPLACE FUNCTION public.get_public_pending_student_approvals(p_branch_id text DEFAULT NULL)
RETURNS TABLE (
  kind text,
  id uuid,
  student_id uuid,
  display_name text,
  branch_id text,
  branch_name text,
  submitted_at timestamptz,
  details jsonb,
  current_values jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    'registration'::text AS kind,
    r.id,
    NULL::uuid AS student_id,
    btrim(coalesce(r.first_name,'') || ' ' || coalesce(r.last_name,'')) AS display_name,
    r.branch_id,
    b.name AS branch_name,
    r.created_at AS submitted_at,
    jsonb_build_object(
      'first_name', r.first_name,
      'last_name', r.last_name,
      'date_of_birth', r.date_of_birth,
      'gender', r.gender,
      'email', r.email,
      'phone', r.phone,
      'whatsapp', r.whatsapp,
      'current_belt', r.current_belt,
      'emergency_contact_name', r.emergency_contact_name,
      'emergency_contact_phone', r.emergency_contact_phone,
      'medical_conditions', r.medical_conditions,
      'referral_source', r.referral_source
    ) AS details,
    '{}'::jsonb AS current_values
  FROM public.student_registrations r
  LEFT JOIN public.branches b ON b.id = r.branch_id
  WHERE lower(coalesce(r.status,'pending')) = 'pending'
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)

  UNION ALL

  SELECT
    'update_request'::text AS kind,
    u.id,
    u.student_id,
    btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS display_name,
    s.branch_id,
    b.name AS branch_name,
    u.requested_at AS submitted_at,
    CASE WHEN jsonb_typeof(u.requested_changes::jsonb) = 'object'
         THEN u.requested_changes::jsonb ELSE '{}'::jsonb END AS details,
    jsonb_build_object(
      'first_name', s.first_name,
      'last_name', s.last_name,
      'certificate_name', s.certificate_name,
      'display_name', s.display_name,
      'date_of_birth', s.date_of_birth,
      'gender', s.gender,
      'email', s.email,
      'phone', s.phone,
      'whatsapp', s.whatsapp,
      'current_belt', s.current_belt
    ) AS current_values
  FROM public.student_update_requests u
  JOIN public.students s ON s.id = u.student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  WHERE lower(coalesce(u.status,'pending')) = 'pending'
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
  ORDER BY 7 DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_pending_student_approvals(text) TO anon, authenticated, service_role;


-- Approve a registration: create the student and mark it approved
CREATE OR REPLACE FUNCTION public.approve_public_student_registration(p_id uuid, p_actor text DEFAULT 'access')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.student_registrations%ROWTYPE;
  v_first text;
  v_last text;
  v_id uuid;
BEGIN
  SELECT * INTO r FROM public.student_registrations WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF lower(coalesce(r.status,'pending')) <> 'pending' THEN
    RAISE EXCEPTION 'This registration has already been reviewed';
  END IF;

  v_first := upper(btrim(coalesce(r.first_name,'')));
  v_last  := upper(btrim(coalesce(r.last_name,'')));

  INSERT INTO public.students (
    student_number, first_name, last_name, preferred_name, certificate_name, display_name,
    date_of_birth, gender, nric_passport, passport_no, phone, whatsapp, email,
    address, postal_code,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    emergency_contact_2_name, emergency_contact_2_phone, emergency_contact_2_relationship,
    current_belt, previous_experience, training_goals, medical_conditions, dietary_restrictions,
    branch_id, notes, referral_source, registered_date, status, created_by, updated_by
  ) VALUES (
    public.generate_student_number(), v_first, v_last,
    nullif(btrim(coalesce(r.preferred_name,'')),''),
    coalesce(nullif(btrim(coalesce(r.certificate_name,'')),''), btrim(v_first||' '||v_last)),
    coalesce(nullif(btrim(coalesce(r.display_name,'')),''), btrim(v_first||' '||v_last)),
    r.date_of_birth, nullif(lower(btrim(coalesce(r.gender,''))),''),
    r.nric_passport, r.passport_no, r.phone, r.whatsapp,
    nullif(lower(btrim(coalesce(r.email,''))),''),
    r.address, r.postal_code,
    r.emergency_contact_name, r.emergency_contact_phone, r.emergency_contact_relationship,
    r.emergency_contact_2_name, r.emergency_contact_2_phone, r.emergency_contact_2_relationship,
    nullif(btrim(coalesce(r.current_belt,'')),''),
    r.previous_experience, r.training_goals, r.medical_conditions, r.dietary_restrictions,
    r.branch_id, r.notes, r.referral_source, current_date, 'active', p_actor, p_actor
  ) RETURNING id INTO v_id;

  INSERT INTO public.student_change_logs (student_id, action, changes, changed_by)
  VALUES (v_id, 'create',
          jsonb_build_object('source','access_summary_approval','registration_id', p_id),
          p_actor);

  UPDATE public.student_registrations
     SET status = 'approved', reviewed_by = p_actor, reviewed_at = now()
   WHERE id = p_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_public_student_registration(uuid, text) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.reject_public_student_registration(p_id uuid, p_reason text DEFAULT NULL, p_actor text DEFAULT 'access')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_registrations
     SET status = 'rejected', reviewed_by = p_actor, reviewed_at = now(),
         review_notes = nullif(btrim(coalesce(p_reason,'')),'')
   WHERE id = p_id AND lower(coalesce(status,'pending')) = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found or already reviewed'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_public_student_registration(uuid, text, text) TO anon, authenticated, service_role;


-- Approve a detail change request: apply allowed fields only
CREATE OR REPLACE FUNCTION public.approve_public_student_update_request(p_id uuid, p_actor text DEFAULT 'access')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  u public.student_update_requests%ROWTYPE;
  v_changes jsonb;
  v_applied jsonb := '{}'::jsonb;
  k text;
  v text;
BEGIN
  SELECT * INTO u FROM public.student_update_requests WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF lower(coalesce(u.status,'pending')) <> 'pending' THEN
    RAISE EXCEPTION 'This request has already been reviewed';
  END IF;

  v_changes := CASE WHEN jsonb_typeof(u.requested_changes::jsonb) = 'object'
                    THEN u.requested_changes::jsonb ELSE '{}'::jsonb END;

  FOR k, v IN SELECT key, value #>> '{}' FROM jsonb_each(v_changes) LOOP
    IF k = 'first_name' THEN
      UPDATE public.students SET first_name = upper(btrim(v)) WHERE id = u.student_id;
    ELSIF k = 'last_name' THEN
      UPDATE public.students SET last_name = upper(btrim(coalesce(v,''))) WHERE id = u.student_id;
    ELSIF k = 'certificate_name' THEN
      UPDATE public.students SET certificate_name = upper(btrim(coalesce(v,''))) WHERE id = u.student_id;
    ELSIF k = 'display_name' THEN
      UPDATE public.students SET display_name = upper(btrim(coalesce(v,''))) WHERE id = u.student_id;
    ELSIF k = 'preferred_name' THEN
      UPDATE public.students SET preferred_name = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSIF k = 'date_of_birth' THEN
      UPDATE public.students SET date_of_birth = nullif(btrim(coalesce(v,'')),'')::date WHERE id = u.student_id;
    ELSIF k = 'gender' THEN
      UPDATE public.students SET gender = nullif(lower(btrim(coalesce(v,''))),'') WHERE id = u.student_id;
    ELSIF k = 'email' THEN
      UPDATE public.students SET email = nullif(lower(btrim(coalesce(v,''))),'') WHERE id = u.student_id;
    ELSIF k = 'phone' THEN
      UPDATE public.students SET phone = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSIF k = 'whatsapp' THEN
      UPDATE public.students SET whatsapp = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSIF k = 'current_belt' THEN
      UPDATE public.students SET current_belt = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSE
      CONTINUE;
    END IF;
    v_applied := v_applied || jsonb_build_object(k, v);
  END LOOP;

  UPDATE public.students SET updated_by = p_actor, updated_at = now() WHERE id = u.student_id;

  INSERT INTO public.student_change_logs (student_id, action, changes, changed_by)
  VALUES (u.student_id, 'update',
          jsonb_build_object('source','access_summary_approval','request_id', p_id, 'applied', v_applied),
          p_actor);

  UPDATE public.student_update_requests
     SET status = 'approved', reviewed_by = p_actor, reviewed_at = now()
   WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_public_student_update_request(uuid, text) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.reject_public_student_update_request(p_id uuid, p_reason text DEFAULT NULL, p_actor text DEFAULT 'access')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_update_requests
     SET status = 'rejected', reviewed_by = p_actor, reviewed_at = now(),
         review_notes = nullif(btrim(coalesce(p_reason,'')),'')
   WHERE id = p_id AND lower(coalesce(status,'pending')) = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already reviewed'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_public_student_update_request(uuid, text, text) TO anon, authenticated, service_role;
