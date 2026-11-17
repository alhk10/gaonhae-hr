CREATE TABLE public.grading_slot_score_settings (
  slot_id uuid PRIMARY KEY,
  extra_fields text[] NOT NULL DEFAULT '{}',
  hide_body_metrics boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.grading_slot_score_settings TO anon, authenticated;
GRANT ALL ON public.grading_slot_score_settings TO service_role;
ALTER TABLE public.grading_slot_score_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read slot score settings" ON public.grading_slot_score_settings FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.access_grading_slot_score_settings_set(p_password text, p_slot_id uuid, p_extra_fields text[], p_hide_body boolean)
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
  INSERT INTO grading_slot_score_settings(slot_id, extra_fields, hide_body_metrics, updated_at)
  VALUES (p_slot_id, coalesce(p_extra_fields,'{}'), coalesce(p_hide_body,false), now())
  ON CONFLICT (slot_id) DO UPDATE SET extra_fields = EXCLUDED.extra_fields, hide_body_metrics = EXCLUDED.hide_body_metrics, updated_at = now();
END $$;
GRANT EXECUTE ON FUNCTION public.access_grading_slot_score_settings_set(text, uuid, text[], boolean) TO anon, authenticated;