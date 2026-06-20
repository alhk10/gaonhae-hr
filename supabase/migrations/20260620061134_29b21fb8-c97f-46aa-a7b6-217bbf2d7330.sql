CREATE TABLE IF NOT EXISTS public.competition_extra_line_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  default_amount NUMERIC NOT NULL DEFAULT 0,
  requires_weight BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.competition_extra_line_presets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_extra_line_presets TO authenticated;
GRANT ALL ON public.competition_extra_line_presets TO service_role;

ALTER TABLE public.competition_extra_line_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active presets"
  ON public.competition_extra_line_presets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated manage presets"
  ON public.competition_extra_line_presets FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_competition_extra_line_presets_updated_at
  BEFORE UPDATE ON public.competition_extra_line_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.competition_extra_line_presets (name, default_amount, requires_weight, display_order) VALUES
  ('Individual Poomsae', 110, false, 1),
  ('Individual Kyorugi', 110, true, 2),
  ('Mix Pair', 65, false, 3),
  ('Mix Team', 65, false, 4)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_competition_extra_line_presets()
RETURNS TABLE (
  id UUID,
  name TEXT,
  default_amount NUMERIC,
  requires_weight BOOLEAN,
  display_order INTEGER,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, default_amount, requires_weight, display_order, is_active
  FROM public.competition_extra_line_presets
  WHERE is_active = true
  ORDER BY display_order, name;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_competition_extra_line_presets() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_competition_extra_line_presets()
RETURNS SETOF public.competition_extra_line_presets
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.competition_extra_line_presets ORDER BY display_order, name;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_competition_extra_line_presets() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_competition_extra_line_preset(
  p_id UUID,
  p_name TEXT,
  p_default_amount NUMERIC,
  p_requires_weight BOOLEAN,
  p_display_order INTEGER,
  p_is_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.competition_extra_line_presets (name, default_amount, requires_weight, display_order, is_active)
    VALUES (btrim(p_name), COALESCE(p_default_amount, 0), COALESCE(p_requires_weight, false), COALESCE(p_display_order, 0), COALESCE(p_is_active, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.competition_extra_line_presets
       SET name = btrim(p_name),
           default_amount = COALESCE(p_default_amount, 0),
           requires_weight = COALESCE(p_requires_weight, false),
           display_order = COALESCE(p_display_order, 0),
           is_active = COALESCE(p_is_active, true),
           updated_at = now()
     WHERE id = p_id
     RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_competition_extra_line_preset(UUID, TEXT, NUMERIC, BOOLEAN, INTEGER, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_competition_extra_line_preset(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.competition_extra_line_presets WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_competition_extra_line_preset(UUID) TO authenticated;