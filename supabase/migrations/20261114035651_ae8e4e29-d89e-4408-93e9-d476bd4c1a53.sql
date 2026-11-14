CREATE OR REPLACE FUNCTION public._impl_set_grading_slot_meta(p_id uuid, p_is_hidden boolean, p_slot_kind text, p_year integer, p_term integer)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  UPDATE public.grading_slots SET is_hidden = COALESCE(p_is_hidden,false),
    slot_kind = CASE WHEN p_slot_kind IN ('double_promotion','video_grading') THEN p_slot_kind ELSE 'regular' END,
    grading_year = p_year, grading_term = p_term, updated_at = now()
  WHERE id = p_id;
$function$;

CREATE OR REPLACE FUNCTION public._video_grading_slot(p_slot_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.grading_slots; v uuid;
BEGIN
  SELECT * INTO s FROM public.grading_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF s.slot_kind = 'video_grading' THEN RETURN s.id; END IF;
  SELECT id INTO v FROM public.grading_slots
   WHERE slot_kind = 'video_grading' AND grading_date = s.grading_date AND branch_id IS NOT DISTINCT FROM s.branch_id
   ORDER BY created_at LIMIT 1;
  IF v IS NULL THEN
    INSERT INTO public.grading_slots (branch_id, grading_date, start_time, end_time, title, location, is_hidden, slot_kind, grading_year, grading_term)
    VALUES (s.branch_id, s.grading_date, s.start_time, s.end_time, 'Video grading', s.location, true, 'video_grading', s.grading_year, s.grading_term)
    RETURNING id INTO v;
  END IF;
  RETURN v;
END $function$;
REVOKE EXECUTE ON FUNCTION public._video_grading_slot(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_grading_remark(p_registration_id uuid, p_remark text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.grading_registrations; v_new text := NULLIF(btrim(p_remark), ''); v_dp uuid; v_l text := lower(COALESCE(NULLIF(btrim(p_remark), ''),''));
BEGIN
  SELECT * INTO r FROM public.grading_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_l IN ('double testing','video testing') AND r.grading_slot_id IS NOT NULL THEN
    v_dp := CASE WHEN v_l = 'double testing' THEN public._double_promotion_slot(r.grading_slot_id) ELSE public._video_grading_slot(r.grading_slot_id) END;
    UPDATE public.grading_registrations SET remark = v_new,
      original_grading_slot_id = COALESCE(original_grading_slot_id, CASE WHEN grading_slot_id <> v_dp THEN grading_slot_id END),
      grading_slot_id = v_dp WHERE id = r.id;
  ELSIF r.original_grading_slot_id IS NOT NULL THEN
    UPDATE public.grading_registrations SET remark = v_new, grading_slot_id = original_grading_slot_id,
      original_grading_slot_id = NULL WHERE id = r.id;
  ELSE
    UPDATE public.grading_registrations SET remark = v_new WHERE id = r.id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_update_grading_submission_remark(p_submission_id uuid, p_remark text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.grading_payment_submissions; v_new text := NULLIF(btrim(p_remark), ''); v_dp uuid; v_l text := lower(COALESCE(NULLIF(btrim(p_remark), ''),''));
BEGIN
  SELECT * INTO r FROM public.grading_payment_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_l IN ('double testing','video testing') AND r.resolved_grading_slot_id IS NOT NULL THEN
    v_dp := CASE WHEN v_l = 'double testing' THEN public._double_promotion_slot(r.resolved_grading_slot_id) ELSE public._video_grading_slot(r.resolved_grading_slot_id) END;
    UPDATE public.grading_payment_submissions SET remark = v_new,
      original_resolved_slot_id = COALESCE(original_resolved_slot_id, CASE WHEN resolved_grading_slot_id <> v_dp THEN resolved_grading_slot_id END),
      resolved_grading_slot_id = v_dp WHERE id = r.id;
  ELSIF r.original_resolved_slot_id IS NOT NULL THEN
    UPDATE public.grading_payment_submissions SET remark = v_new, resolved_grading_slot_id = original_resolved_slot_id,
      original_resolved_slot_id = NULL WHERE id = r.id;
  ELSE
    UPDATE public.grading_payment_submissions SET remark = v_new WHERE id = r.id;
  END IF;
END $function$;