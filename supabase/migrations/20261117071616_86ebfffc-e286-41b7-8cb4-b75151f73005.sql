ALTER TABLE public.grading_slot_score_settings ADD COLUMN print_scorecard boolean NOT NULL DEFAULT true;
DROP FUNCTION public.access_grading_slot_score_settings_set(text, uuid, text[], boolean);
CREATE FUNCTION public.access_grading_slot_score_settings_set(p_password text, p_slot_id uuid, p_extra_fields text[], p_hide_body boolean, p_print_scorecard boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text;
BEGIN
  IF public._access_scope(p_password) IS NULL
     AND NOT public.is_superadmin(coalesce(auth.jwt()->>'email','')) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  FOREACH f IN ARRAY coalesce(p_extra_fields,'{}') LOOP
    IF length(trim(f)) = 0 OR length(f) > 40 THEN RAISE EXCEPTION 'Invalid field name'; END IF;
  END LOOP;
  INSERT INTO grading_slot_score_settings(slot_id, extra_fields, hide_body_metrics, print_scorecard, updated_at)
  VALUES (p_slot_id, coalesce(p_extra_fields,'{}'), coalesce(p_hide_body,false), coalesce(p_print_scorecard,true), now())
  ON CONFLICT (slot_id) DO UPDATE SET extra_fields = EXCLUDED.extra_fields, hide_body_metrics = EXCLUDED.hide_body_metrics, print_scorecard = EXCLUDED.print_scorecard, updated_at = now();
END $$;
GRANT EXECUTE ON FUNCTION public.access_grading_slot_score_settings_set(text, uuid, text[], boolean, boolean) TO anon, authenticated;