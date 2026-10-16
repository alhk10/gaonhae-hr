ALTER TABLE public.competition_events ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;

CREATE OR REPLACE FUNCTION public.admin_set_competition_event_deadline(p_id uuid, p_deadline timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.competition_events
     SET registration_deadline = p_deadline,
         is_active = CASE WHEN p_deadline IS NOT NULL AND p_deadline <= now() THEN false ELSE is_active END
   WHERE id = p_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_competition_event_deadline(uuid, timestamptz) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_competition_events();
CREATE FUNCTION public.get_public_competition_events()
 RETURNS TABLE(id uuid, name text, is_active boolean, display_order integer, indemnity_clause text, require_indemnity_form boolean, require_passport boolean, require_photo boolean, coaching_label text, coaching_amount numeric, extra_lines jsonb, coaching_required boolean, indemnity_template_url text, indemnity_template_name text, require_grading_card boolean, registration_deadline timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name,
    (e.is_active AND (e.registration_deadline IS NULL OR e.registration_deadline > now())),
    e.display_order, e.indemnity_clause,
    e.require_indemnity_form, e.require_passport, e.require_photo,
    e.coaching_label, COALESCE(e.coaching_amount, 0), COALESCE(e.extra_lines, '[]'::jsonb),
    COALESCE(e.coaching_required, true),
    e.indemnity_template_url, e.indemnity_template_name,
    COALESCE(e.require_grading_card, false), e.registration_deadline
  FROM public.competition_events e
  ORDER BY e.display_order, e.name;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_competition_events() TO anon, authenticated;

DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.submit_competition_payment(jsonb)'::regprocedure) INTO d;
  IF position('competition has closed' in d) = 0 THEN
    d := regexp_replace(d, 'BEGIN\s+IF v_ref IS NOT NULL THEN',
      E'BEGIN\n  IF EXISTS (SELECT 1 FROM public.competition_events ce WHERE ce.id = NULLIF(_row->>''event_id'','''')::uuid AND ce.registration_deadline IS NOT NULL AND ce.registration_deadline <= now()) THEN\n    RAISE EXCEPTION ''Registration for this competition has closed'';\n  END IF;\n  IF v_ref IS NOT NULL THEN');
    EXECUTE d;
  END IF;
END $do$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('competition-deadline-auto-inactive', '0 * * * *',
  $$UPDATE public.competition_events SET is_active = false WHERE is_active AND registration_deadline IS NOT NULL AND registration_deadline <= now();$$);