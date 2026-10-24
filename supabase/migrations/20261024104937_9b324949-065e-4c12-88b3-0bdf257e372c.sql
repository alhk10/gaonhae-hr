ALTER TABLE public.competition_events
  ADD COLUMN IF NOT EXISTS require_one_option boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tshirt_size_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.competition_payment_submissions ADD COLUMN IF NOT EXISTS tshirt_size text;

CREATE OR REPLACE FUNCTION public.admin_set_competition_event_form_options(p_id uuid, p_require_one_option boolean, p_tshirt_size_enabled boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE competition_events SET require_one_option=coalesce(p_require_one_option,false),
    tshirt_size_enabled=coalesce(p_tshirt_size_enabled,false), updated_at=now() WHERE id=p_id;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_competition_event_form_options(uuid,boolean,boolean) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_competition_events();
CREATE FUNCTION public.get_public_competition_events()
 RETURNS TABLE(id uuid, name text, is_active boolean, display_order integer, indemnity_clause text, require_indemnity_form boolean, require_passport boolean, require_photo boolean, coaching_label text, coaching_amount numeric, extra_lines jsonb, coaching_required boolean, indemnity_template_url text, indemnity_template_name text, require_grading_card boolean, registration_deadline timestamp with time zone, require_one_option boolean, tshirt_size_enabled boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name,
    (e.is_active AND (e.registration_deadline IS NULL OR e.registration_deadline > now())),
    e.display_order, e.indemnity_clause,
    e.require_indemnity_form, e.require_passport, e.require_photo,
    e.coaching_label, COALESCE(e.coaching_amount, 0), COALESCE(e.extra_lines, '[]'::jsonb),
    COALESCE(e.coaching_required, true),
    e.indemnity_template_url, e.indemnity_template_name,
    COALESCE(e.require_grading_card, false), e.registration_deadline,
    e.require_one_option, e.tshirt_size_enabled
  FROM public.competition_events e
  ORDER BY e.display_order, e.name;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_competition_events() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._validate_competition_form_options() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE e competition_events%ROWTYPE;
BEGIN
  IF NEW.event_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO e FROM competition_events WHERE id=NEW.event_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF e.require_one_option AND jsonb_array_length(coalesce(NEW.extra_lines,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Please select at least one option';
  END IF;
  IF e.tshirt_size_enabled AND (NEW.tshirt_size IS NULL OR NEW.tshirt_size NOT IN ('100','110','120','130','140','150','160','170','180','190','200')) THEN
    RAISE EXCEPTION 'Please select a T-shirt size';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS competition_form_options_check ON public.competition_payment_submissions;
CREATE TRIGGER competition_form_options_check BEFORE INSERT ON public.competition_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public._validate_competition_form_options();

DO $$ DECLARE d text; BEGIN
  d := pg_get_functiondef('public.submit_competition_payment(jsonb)'::regprocedure);
  d := replace(d, 'coaching_label, coaching_amount, extra_lines, client_ref
  )', 'coaching_label, coaching_amount, extra_lines, client_ref, tshirt_size
  )');
  d := replace(d, '    v_ref
  )
  RETURNING', '    v_ref,
    NULLIF(btrim(_row->>''tshirt_size''),'''')
  )
  RETURNING');
  IF position('tshirt_size' in d) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
  EXECUTE d;
END $$;