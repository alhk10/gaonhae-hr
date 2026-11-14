CREATE TABLE public.grading_override_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  branch_id text,
  term_id uuid,
  registration_id uuid,
  paid_weeks int,
  term_weeks int,
  password_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  seen_by text,
  removed_at timestamptz
);
GRANT SELECT, UPDATE ON public.grading_override_log TO authenticated;
GRANT ALL ON public.grading_override_log TO service_role;
ALTER TABLE public.grading_override_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read overrides" ON public.grading_override_log FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.jwt()->>'email'));
CREATE POLICY "Superadmins update overrides" ON public.grading_override_log FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.jwt()->>'email')) WITH CHECK (public.is_superadmin(auth.jwt()->>'email'));

CREATE OR REPLACE FUNCTION public.access_set_ready_for_grading(p_password text, p_student_id uuid, p_term_id uuid, p_ready boolean, p_fee_override boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_branch text; v_belt text; v_state jsonb; v_ovr boolean := p_ready AND coalesce(p_fee_override,false);
  v_prev boolean; v_reg uuid; v_fee jsonb; v_label text;
BEGIN
  SELECT branch_id, current_belt INTO v_branch, v_belt FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF p_term_id IS NULL THEN RAISE EXCEPTION 'No term for this date'; END IF;
  v_state := public._grading_ready_state(p_student_id, p_term_id);
  IF NOT p_ready AND (v_state->>'paid')::boolean THEN RAISE EXCEPTION 'Grading already paid'; END IF;
  SELECT id, fee_override INTO v_reg, v_prev FROM grading_registrations WHERE student_id = p_student_id AND term_id = p_term_id LIMIT 1;
  IF v_reg IS NOT NULL THEN
    UPDATE grading_registrations SET ready_for_grading = p_ready, fee_override = v_ovr WHERE student_id = p_student_id AND term_id = p_term_id;
  ELSIF p_ready THEN
    INSERT INTO grading_registrations (student_id, term_id, branch_id, current_belt, target_belt, ready_for_grading, fee_override, created_by)
    VALUES (p_student_id, p_term_id, v_branch, coalesce(v_belt,'No belt'), coalesce(v_belt,'No belt'), true, v_ovr, 'access_attendance')
    RETURNING id INTO v_reg;
  END IF;
  IF v_ovr AND NOT coalesce(v_prev,false) THEN
    BEGIN v_fee := to_jsonb(f) FROM public.access_grading_term_fee_status(p_password, p_student_id, p_term_id) f LIMIT 1;
    EXCEPTION WHEN others THEN v_fee := NULL; END;
    SELECT label INTO v_label FROM access_unlock_passwords
      WHERE password_hash = encode(extensions.digest(coalesce(p_password,''),'sha256'),'hex') LIMIT 1;
    INSERT INTO grading_override_log (student_id, branch_id, term_id, registration_id, paid_weeks, term_weeks, password_label)
    VALUES (p_student_id, v_branch, p_term_id, v_reg, (v_fee->>'paid_weeks')::int, (v_fee->>'term_weeks')::int, v_label);
  ELSIF NOT v_ovr AND coalesce(v_prev,false) THEN
    UPDATE grading_override_log SET removed_at = now()
      WHERE id = (SELECT id FROM grading_override_log WHERE student_id = p_student_id AND term_id = p_term_id AND removed_at IS NULL ORDER BY created_at DESC LIMIT 1);
  END IF;
  RETURN public._grading_ready_state(p_student_id, p_term_id);
END $function$;

CREATE OR REPLACE FUNCTION public.access_grading_overrides(p_password text)
 RETURNS TABLE(id uuid, student_name text, branch_name text, term_name text, paid_weeks int, term_weeks int, password_label text, created_at timestamptz, seen_at timestamptz, removed_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public._access_scope_read(p_password) IS DISTINCT FROM '*' THEN RAISE EXCEPTION 'All-branch password required'; END IF;
  RETURN QUERY SELECT o.id, trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')), b.name, t.name,
    o.paid_weeks, o.term_weeks, o.password_label, o.created_at, o.seen_at, o.removed_at
  FROM grading_override_log o LEFT JOIN students s ON s.id=o.student_id
  LEFT JOIN branches b ON b.id=o.branch_id LEFT JOIN term_calendars t ON t.id=o.term_id
  ORDER BY o.created_at DESC LIMIT 300;
END $$;

CREATE OR REPLACE FUNCTION public.access_grading_override_mark_seen(p_password text, p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public._access_require_all(p_password);
  UPDATE grading_override_log SET seen_at = now(), seen_by = 'access' WHERE id = p_id AND seen_at IS NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.access_grading_overrides(text), public.access_grading_override_mark_seen(text, uuid) TO anon, authenticated;