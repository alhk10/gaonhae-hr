CREATE OR REPLACE FUNCTION public.admin_update_student_basic(
  p_student_id uuid,
  p_belt text,
  p_branch_id text,
  p_status text,
  p_actor text,
  p_clear_belt boolean DEFAULT false,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_alt_emails text[] DEFAULT NULL,
  p_alt_phones text[] DEFAULT NULL,
  p_clear_email boolean DEFAULT false,
  p_clear_phone boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old students%ROWTYPE;
  v_status text;
  v_new_belt text;
  v_first text;
  v_last text;
  v_email text;
  v_phone text;
  v_dob date;
  v_alt_emails text[];
  v_alt_phones text[];
BEGIN
  SELECT * INTO v_old FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  v_status := CASE WHEN p_status IS NULL OR btrim(p_status) = '' THEN NULL ELSE lower(btrim(p_status)) END;
  IF v_status IS NOT NULL AND v_status NOT IN ('active','inactive','trial') THEN
    RAISE EXCEPTION 'Invalid status: %. Use active, inactive or trial (withdrawal requires approval).', p_status;
  END IF;

  v_new_belt := CASE
    WHEN p_clear_belt THEN NULL
    WHEN p_belt IS NOT NULL THEN NULLIF(btrim(p_belt),'')
    ELSE v_old.current_belt
  END;

  v_first := COALESCE(NULLIF(upper(btrim(coalesce(p_first_name,''))),''), v_old.first_name);
  v_last  := CASE WHEN p_last_name IS NULL THEN v_old.last_name
                  ELSE NULLIF(upper(btrim(p_last_name)),'') END;
  v_dob   := COALESCE(p_date_of_birth, v_old.date_of_birth);
  v_email := CASE WHEN p_clear_email THEN NULL
                  WHEN p_email IS NOT NULL THEN NULLIF(lower(btrim(p_email)),'')
                  ELSE v_old.email END;
  v_phone := CASE WHEN p_clear_phone THEN NULL
                  WHEN p_phone IS NOT NULL THEN NULLIF(btrim(p_phone),'')
                  ELSE v_old.phone END;

  v_alt_emails := CASE WHEN p_alt_emails IS NULL THEN v_old.alt_emails
    ELSE (SELECT COALESCE(array_agg(DISTINCT lower(btrim(e))), '{}'::text[])
          FROM unnest(p_alt_emails) e WHERE NULLIF(btrim(e),'') IS NOT NULL) END;
  v_alt_phones := CASE WHEN p_alt_phones IS NULL THEN v_old.alt_phones
    ELSE (SELECT COALESCE(array_agg(DISTINCT btrim(e)), '{}'::text[])
          FROM unnest(p_alt_phones) e WHERE NULLIF(btrim(e),'') IS NOT NULL) END;

  UPDATE students SET
    current_belt = v_new_belt,
    branch_id = COALESCE(NULLIF(btrim(coalesce(p_branch_id,'')),''), branch_id),
    status = COALESCE(v_status, status),
    first_name = v_first,
    last_name = v_last,
    date_of_birth = v_dob,
    email = v_email,
    phone = v_phone,
    alt_emails = v_alt_emails,
    alt_phones = v_alt_phones,
    updated_at = now(),
    updated_by = p_actor
  WHERE id = p_student_id;

  IF v_new_belt IS DISTINCT FROM v_old.current_belt THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'current_belt', v_old.current_belt, v_new_belt, p_actor);
  END IF;
  IF p_branch_id IS NOT NULL AND NULLIF(btrim(p_branch_id),'') IS DISTINCT FROM v_old.branch_id THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'branch_id', v_old.branch_id, btrim(p_branch_id), p_actor);
  END IF;
  IF v_status IS NOT NULL AND v_status IS DISTINCT FROM v_old.status THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'status', v_old.status, v_status, p_actor);
  END IF;
  IF v_first IS DISTINCT FROM v_old.first_name THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'first_name', v_old.first_name, v_first, p_actor);
  END IF;
  IF v_last IS DISTINCT FROM v_old.last_name THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'last_name', v_old.last_name, v_last, p_actor);
  END IF;
  IF v_dob IS DISTINCT FROM v_old.date_of_birth THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'date_of_birth', v_old.date_of_birth::text, v_dob::text, p_actor);
  END IF;
  IF v_email IS DISTINCT FROM v_old.email THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'email', v_old.email, v_email, p_actor);
  END IF;
  IF v_phone IS DISTINCT FROM v_old.phone THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'phone', v_old.phone, v_phone, p_actor);
  END IF;
  IF v_alt_emails IS DISTINCT FROM v_old.alt_emails THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'alt_emails', array_to_string(coalesce(v_old.alt_emails,'{}'), ', '), array_to_string(coalesce(v_alt_emails,'{}'), ', '), p_actor);
  END IF;
  IF v_alt_phones IS DISTINCT FROM v_old.alt_phones THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'alt_phones', array_to_string(coalesce(v_old.alt_phones,'{}'), ', '), array_to_string(coalesce(v_alt_phones,'{}'), ', '), p_actor);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_student_contacts(p_student_id uuid)
RETURNS TABLE (email text, phone text, alt_emails text[], alt_phones text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.email, s.phone, COALESCE(s.alt_emails, '{}'::text[]), COALESCE(s.alt_phones, '{}'::text[])
  FROM public.students s
  WHERE s.id = p_student_id;
$$;