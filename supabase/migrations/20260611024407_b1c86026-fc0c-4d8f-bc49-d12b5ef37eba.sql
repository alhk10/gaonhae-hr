
-- 1) Events tables
CREATE TABLE IF NOT EXISTS public.competition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  coaching_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  indemnity_clause text,
  require_indemnity_form boolean NOT NULL DEFAULT false,
  require_passport boolean NOT NULL DEFAULT false,
  require_photo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.competition_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_events TO authenticated;
GRANT ALL ON public.competition_events TO service_role;

ALTER TABLE public.competition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active competition events"
  ON public.competition_events FOR SELECT
  USING (is_active = true OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin manage competition events"
  ON public.competition_events FOR ALL
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE TRIGGER trg_competition_events_updated_at
  BEFORE UPDATE ON public.competition_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.competition_event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, product_id)
);

GRANT SELECT ON public.competition_event_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_event_categories TO authenticated;
GRANT ALL ON public.competition_event_categories TO service_role;

ALTER TABLE public.competition_event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read competition event categories"
  ON public.competition_event_categories FOR SELECT
  USING (true);

CREATE POLICY "Superadmin manage competition event categories"
  ON public.competition_event_categories FOR ALL
  USING (public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.get_current_user_role() = 'superadmin');

-- 2) Submission columns
ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.competition_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS indemnity_form_url text,
  ADD COLUMN IF NOT EXISTS passport_url text,
  ADD COLUMN IF NOT EXISTS photo_url text;

-- 3) Update submit RPC
CREATE OR REPLACE FUNCTION public.submit_competition_payment(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.competition_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt, coaching_product_id, category_product_ids,
    amount, payment_method, proof_url, certificate_url, status,
    event_id, gender, signature_url, indemnity_form_url, passport_url, photo_url
  )
  VALUES (
    upper(btrim((_row->>'first_name'))),
    upper(btrim((_row->>'last_name'))),
    NULLIF(lower(btrim(_row->>'email')),''),
    (_row->>'branch_id')::text,
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(_row->>'current_belt',''),
    NULLIF(_row->>'coaching_product_id','')::uuid,
    COALESCE(
      ARRAY(SELECT (jsonb_array_elements_text(_row->'category_product_ids'))::uuid),
      '{}'::uuid[]
    ),
    NULLIF(_row->>'amount','')::numeric,
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    NULLIF(_row->>'certificate_url',''),
    'pending_verification',
    NULLIF(_row->>'event_id','')::uuid,
    NULLIF(lower(btrim(_row->>'gender')),''),
    NULLIF(_row->>'signature_url',''),
    NULLIF(_row->>'indemnity_form_url',''),
    NULLIF(_row->>'passport_url',''),
    NULLIF(_row->>'photo_url','')
  )
  RETURNING competition_payment_submissions.id, competition_payment_submissions.reference_number;
END;
$$;

-- 4) Update list RPC to include new fields + event name
DROP FUNCTION IF EXISTS public.get_public_competition_list(text);

CREATE OR REPLACE FUNCTION public.get_public_competition_list(p_branch_id text DEFAULT NULL::text)
RETURNS TABLE(
  submission_id uuid,
  branch_id text,
  branch_name text,
  student_name text,
  current_belt text,
  coaching_paid boolean,
  category_count integer,
  category_names text[],
  certificate_url text,
  proof_url text,
  status text,
  paid_status text,
  amount numeric,
  reference_number text,
  created_at timestamptz,
  poomsae_1 text,
  poomsae_2 text,
  competition_at timestamptz,
  reporting_at timestamptz,
  court text,
  event_id uuid,
  event_name text,
  gender text,
  signature_url text,
  indemnity_form_url text,
  passport_url text,
  photo_url text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cps.id,
    cps.branch_id,
    b.name,
    upper(btrim(coalesce(cps.first_name,'') || ' ' || coalesce(cps.last_name,''))),
    cps.current_belt,
    (cps.coaching_product_id IS NOT NULL),
    COALESCE(array_length(cps.category_product_ids, 1), 0),
    COALESCE(
      (SELECT array_agg(p.name ORDER BY p.name)
       FROM public.products p
       WHERE p.id = ANY(cps.category_product_ids)),
      '{}'::text[]
    ),
    cps.certificate_url,
    cps.proof_url,
    cps.status,
    CASE
      WHEN cps.status = 'verified' THEN 'paid'
      WHEN cps.status = 'rejected' THEN 'rejected'
      ELSE 'pending verification'
    END,
    cps.amount,
    cps.reference_number,
    cps.created_at,
    cps.poomsae_1,
    cps.poomsae_2,
    cps.competition_at,
    cps.reporting_at,
    cps.court,
    cps.event_id,
    ev.name,
    cps.gender,
    cps.signature_url,
    cps.indemnity_form_url,
    cps.passport_url,
    cps.photo_url
  FROM public.competition_payment_submissions cps
  LEFT JOIN public.branches b ON b.id = cps.branch_id
  LEFT JOIN public.competition_events ev ON ev.id = cps.event_id
  WHERE cps.status <> 'rejected'
    AND (p_branch_id IS NULL OR cps.branch_id = p_branch_id)
  ORDER BY cps.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_competition_list(text) TO anon, authenticated, service_role;

-- 5) Public RPC: active events with categories + coaching product
CREATE OR REPLACE FUNCTION public.get_public_competition_events()
RETURNS TABLE(
  id uuid,
  name text,
  is_active boolean,
  display_order integer,
  coaching_product_id uuid,
  coaching_product_name text,
  coaching_product_price numeric,
  coaching_product_tax_rate numeric,
  indemnity_clause text,
  require_indemnity_form boolean,
  require_passport boolean,
  require_photo boolean,
  categories jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.id, e.name, e.is_active, e.display_order,
    e.coaching_product_id,
    cp.name,
    cp.base_price,
    cp.tax_rate,
    e.indemnity_clause,
    e.require_indemnity_form, e.require_passport, e.require_photo,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'product_id', cec.product_id,
        'name', p.name,
        'base_price', p.base_price,
        'tax_rate', p.tax_rate,
        'display_order', cec.display_order
      ) ORDER BY cec.display_order, p.name)
       FROM public.competition_event_categories cec
       JOIN public.products p ON p.id = cec.product_id
       WHERE cec.event_id = e.id AND cec.is_active = true),
      '[]'::jsonb
    )
  FROM public.competition_events e
  LEFT JOIN public.products cp ON cp.id = e.coaching_product_id
  ORDER BY e.display_order, e.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_competition_events() TO anon, authenticated, service_role;

-- 6) Admin upsert event (anon-callable, same pattern as other admin_* competition RPCs)
CREATE OR REPLACE FUNCTION public.admin_upsert_competition_event(
  p_id uuid,
  p_name text,
  p_is_active boolean,
  p_display_order integer,
  p_coaching_product_id uuid,
  p_indemnity_clause text,
  p_require_indemnity_form boolean,
  p_require_passport boolean,
  p_require_photo boolean,
  p_category_product_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_pid uuid;
  v_order integer;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.competition_events (
      name, is_active, display_order, coaching_product_id,
      indemnity_clause, require_indemnity_form, require_passport, require_photo
    ) VALUES (
      btrim(p_name), COALESCE(p_is_active,true), COALESCE(p_display_order,0), p_coaching_product_id,
      NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      COALESCE(p_require_indemnity_form,false),
      COALESCE(p_require_passport,false),
      COALESCE(p_require_photo,false)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.competition_events SET
      name = btrim(p_name),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      coaching_product_id = p_coaching_product_id,
      indemnity_clause = NULLIF(btrim(coalesce(p_indemnity_clause,'')),''),
      require_indemnity_form = COALESCE(p_require_indemnity_form, require_indemnity_form),
      require_passport = COALESCE(p_require_passport, require_passport),
      require_photo = COALESCE(p_require_photo, require_photo),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  -- Sync categories
  DELETE FROM public.competition_event_categories
   WHERE event_id = v_id
     AND (p_category_product_ids IS NULL OR NOT (product_id = ANY(p_category_product_ids)));

  IF p_category_product_ids IS NOT NULL THEN
    v_order := 0;
    FOREACH v_pid IN ARRAY p_category_product_ids LOOP
      INSERT INTO public.competition_event_categories (event_id, product_id, display_order, is_active)
      VALUES (v_id, v_pid, v_order, true)
      ON CONFLICT (event_id, product_id)
      DO UPDATE SET display_order = EXCLUDED.display_order, is_active = true;
      v_order := v_order + 1;
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_competition_event(uuid, text, boolean, integer, uuid, text, boolean, boolean, boolean, uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_competition_event(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.competition_payment_submissions WHERE event_id = p_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete event with % existing submission(s). Deactivate it instead.', v_count;
  END IF;
  DELETE FROM public.competition_events WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_competition_event(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_competition_event_active(p_id uuid, p_active boolean)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.competition_events SET is_active = p_active, updated_at = now() WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_competition_event_active(uuid, boolean) TO anon, authenticated, service_role;
