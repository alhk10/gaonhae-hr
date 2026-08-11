ALTER TABLE public.seminar_events ALTER COLUMN min_packages SET DEFAULT 0;

DROP FUNCTION IF EXISTS public.admin_upsert_seminar_event(uuid, text, boolean, integer, jsonb, text, text, text, boolean, boolean, boolean, boolean, text[], text[]);

CREATE OR REPLACE FUNCTION public.admin_upsert_seminar_event(
  p_id uuid,
  p_name text,
  p_is_active boolean,
  p_display_order integer,
  p_packages jsonb,
  p_indemnity_clause text DEFAULT NULL::text,
  p_indemnity_template_url text DEFAULT NULL::text,
  p_indemnity_template_name text DEFAULT NULL::text,
  p_require_passport boolean DEFAULT false,
  p_require_photo boolean DEFAULT false,
  p_require_grading_card boolean DEFAULT false,
  p_multi_package_discount boolean DEFAULT false,
  p_branch_ids text[] DEFAULT '{}'::text[],
  p_belts text[] DEFAULT '{}'::text[],
  p_min_packages integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.seminar_events (
      name, is_active, display_order, packages, indemnity_clause,
      indemnity_template_url, indemnity_template_name,
      require_passport, require_photo, require_grading_card, multi_package_discount,
      branch_ids, belts, min_packages
    ) VALUES (
      btrim(p_name), COALESCE(p_is_active, true), COALESCE(p_display_order, 0),
      COALESCE(p_packages, '[]'::jsonb),
      NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      NULLIF(btrim(coalesce(p_indemnity_template_url,'')),''),
      NULLIF(btrim(coalesce(p_indemnity_template_name,'')),''),
      COALESCE(p_require_passport,false),
      COALESCE(p_require_photo,false),
      COALESCE(p_require_grading_card,false),
      COALESCE(p_multi_package_discount,false),
      COALESCE(p_branch_ids, '{}'::text[]),
      COALESCE(p_belts, '{}'::text[]),
      GREATEST(COALESCE(p_min_packages, 0), 0)
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.seminar_events SET
      name = btrim(p_name),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      packages = COALESCE(p_packages, '[]'::jsonb),
      indemnity_clause = NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      indemnity_template_url = NULLIF(btrim(coalesce(p_indemnity_template_url,'')),''),
      indemnity_template_name = NULLIF(btrim(coalesce(p_indemnity_template_name,'')),''),
      require_passport = COALESCE(p_require_passport, require_passport),
      require_photo = COALESCE(p_require_photo, require_photo),
      require_grading_card = COALESCE(p_require_grading_card, require_grading_card),
      multi_package_discount = COALESCE(p_multi_package_discount, multi_package_discount),
      branch_ids = COALESCE(p_branch_ids, branch_ids),
      belts = COALESCE(p_belts, belts),
      min_packages = GREATEST(COALESCE(p_min_packages, min_packages), 0),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_seminar_events()
RETURNS TABLE(id uuid, name text, is_active boolean, display_order integer, packages jsonb, indemnity_clause text, indemnity_template_url text, indemnity_template_name text, require_passport boolean, require_photo boolean, require_grading_card boolean, multi_package_discount boolean, branch_ids text[], belts text[], min_packages integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name, e.is_active, e.display_order,
         COALESCE(e.packages, '[]'::jsonb),
         e.indemnity_clause, e.indemnity_template_url, e.indemnity_template_name,
         e.require_passport, e.require_photo, e.require_grading_card,
         e.multi_package_discount,
         COALESCE(e.branch_ids, '{}'::text[]),
         COALESCE(e.belts, '{}'::text[]),
         COALESCE(e.min_packages, 0)
  FROM public.seminar_events e
  ORDER BY e.display_order, e.name;
$function$;