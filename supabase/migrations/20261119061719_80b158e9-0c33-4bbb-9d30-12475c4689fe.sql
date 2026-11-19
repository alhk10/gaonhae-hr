CREATE TABLE public.grading_branch_score_settings (
  branch_id text PRIMARY KEY,
  print_scorecard boolean NOT NULL DEFAULT true,
  hide_body_metrics boolean NOT NULL DEFAULT false,
  extra_fields text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT SELECT ON public.grading_branch_score_settings TO anon, authenticated;
GRANT ALL ON public.grading_branch_score_settings TO service_role;
ALTER TABLE public.grading_branch_score_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read branch score settings" ON public.grading_branch_score_settings FOR SELECT USING (true);

INSERT INTO public.grading_branch_score_settings(branch_id, print_scorecard, hide_body_metrics, extra_fields)
SELECT gs.branch_id, true, false,
  coalesce((SELECT array_agg(DISTINCT f) FROM grading_slot_score_settings s2 JOIN grading_slots g2 ON g2.id=s2.slot_id, unnest(s2.extra_fields) f WHERE g2.branch_id=gs.branch_id),'{}')
FROM grading_slot_score_settings s JOIN grading_slots gs ON gs.id=s.slot_id
WHERE gs.branch_id IS NOT NULL GROUP BY gs.branch_id
ON CONFLICT DO NOTHING;

CREATE FUNCTION public.access_grading_branch_score_settings_set(p_password text, p_branch_id text, p_extra_fields text[], p_hide_body boolean, p_print_scorecard boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text;
BEGIN
  IF coalesce(public._access_scope(p_password),'') <> '*'
     AND NOT public.is_superadmin(coalesce(auth.jwt()->>'email','')) THEN
    RAISE EXCEPTION 'Only superadmin or the all-branch password can change scorecard settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM branches WHERE id = p_branch_id) THEN RAISE EXCEPTION 'Unknown branch'; END IF;
  FOREACH f IN ARRAY coalesce(p_extra_fields,'{}') LOOP
    IF length(trim(f)) = 0 OR length(f) > 40 THEN RAISE EXCEPTION 'Invalid field name'; END IF;
  END LOOP;
  INSERT INTO grading_branch_score_settings(branch_id, extra_fields, hide_body_metrics, print_scorecard, updated_at, updated_by)
  VALUES (p_branch_id, coalesce(p_extra_fields,'{}'), coalesce(p_hide_body,false), coalesce(p_print_scorecard,true), now(), coalesce(auth.jwt()->>'email','access'))
  ON CONFLICT (branch_id) DO UPDATE SET extra_fields=EXCLUDED.extra_fields, hide_body_metrics=EXCLUDED.hide_body_metrics, print_scorecard=EXCLUDED.print_scorecard, updated_at=now(), updated_by=EXCLUDED.updated_by;
END $$;
REVOKE ALL ON FUNCTION public.access_grading_branch_score_settings_set(text,text,text[],boolean,boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.access_grading_branch_score_settings_set(text,text,text[],boolean,boolean) TO anon, authenticated;