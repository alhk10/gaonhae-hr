
ALTER TABLE public.competition_events
  ADD COLUMN IF NOT EXISTS coaching_required boolean NOT NULL DEFAULT true;

DROP FUNCTION IF EXISTS public.get_public_competition_events();

CREATE OR REPLACE FUNCTION public.get_public_competition_events()
 RETURNS TABLE(id uuid, name text, is_active boolean, display_order integer, indemnity_clause text, require_indemnity_form boolean, require_passport boolean, require_photo boolean, coaching_label text, coaching_amount numeric, extra_lines jsonb, coaching_required boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id, e.name, e.is_active, e.display_order,
    e.indemnity_clause,
    e.require_indemnity_form, e.require_passport, e.require_photo,
    e.coaching_label, COALESCE(e.coaching_amount, 0), COALESCE(e.extra_lines, '[]'::jsonb),
    COALESCE(e.coaching_required, true)
  FROM public.competition_events e
  ORDER BY e.display_order, e.name;
$function$;

DROP FUNCTION IF EXISTS public.admin_upsert_competition_event(uuid, text, boolean, integer, text, boolean, boolean, boolean, text, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.admin_upsert_competition_event(
  p_id uuid,
  p_name text,
  p_is_active boolean,
  p_display_order integer,
  p_indemnity_clause text,
  p_require_indemnity_form boolean,
  p_require_passport boolean,
  p_require_photo boolean,
  p_coaching_label text,
  p_coaching_amount numeric,
  p_extra_lines jsonb,
  p_coaching_required boolean DEFAULT true
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.competition_events (
      name, is_active, display_order,
      indemnity_clause, require_indemnity_form, require_passport, require_photo,
      coaching_label, coaching_amount, extra_lines, coaching_required
    ) VALUES (
      btrim(p_name), COALESCE(p_is_active,true), COALESCE(p_display_order,0),
      NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      COALESCE(p_require_indemnity_form,false),
      COALESCE(p_require_passport,false),
      COALESCE(p_require_photo,false),
      NULLIF(btrim(coalesce(p_coaching_label,'')),''),
      COALESCE(p_coaching_amount, 0),
      COALESCE(p_extra_lines, '[]'::jsonb),
      COALESCE(p_coaching_required, true)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.competition_events SET
      name = btrim(p_name),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      indemnity_clause = NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      require_indemnity_form = COALESCE(p_require_indemnity_form, require_indemnity_form),
      require_passport = COALESCE(p_require_passport, require_passport),
      require_photo = COALESCE(p_require_photo, require_photo),
      coaching_label = NULLIF(btrim(coalesce(p_coaching_label,'')),''),
      coaching_amount = COALESCE(p_coaching_amount, 0),
      extra_lines = COALESCE(p_extra_lines, '[]'::jsonb),
      coaching_required = COALESCE(p_coaching_required, coaching_required),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$;
