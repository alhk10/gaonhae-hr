REVOKE EXECUTE ON FUNCTION public._double_promotion_slot(uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION public.admin_update_grading_submission_remark(uuid, text);
CREATE FUNCTION public.admin_update_grading_submission_remark(p_submission_id uuid, p_remark text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE r public.grading_payment_submissions; v_new text := NULLIF(btrim(p_remark), ''); v_dp uuid;
BEGIN
  SELECT * INTO r FROM public.grading_payment_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF lower(COALESCE(v_new,'')) = 'double testing' AND r.resolved_grading_slot_id IS NOT NULL THEN
    v_dp := public._double_promotion_slot(r.resolved_grading_slot_id);
    UPDATE public.grading_payment_submissions SET remark = v_new,
      original_resolved_slot_id = COALESCE(original_resolved_slot_id, CASE WHEN resolved_grading_slot_id <> v_dp THEN resolved_grading_slot_id END),
      resolved_grading_slot_id = v_dp WHERE id = r.id;
  ELSIF r.original_resolved_slot_id IS NOT NULL THEN
    UPDATE public.grading_payment_submissions SET remark = v_new, resolved_grading_slot_id = original_resolved_slot_id,
      original_resolved_slot_id = NULL WHERE id = r.id;
  ELSE
    UPDATE public.grading_payment_submissions SET remark = v_new WHERE id = r.id;
  END IF;
END $f$;
GRANT EXECUTE ON FUNCTION public.admin_update_grading_submission_remark(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_grading_slots() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_grading_slot_meta(uuid,boolean,text,integer,integer) TO anon, authenticated;