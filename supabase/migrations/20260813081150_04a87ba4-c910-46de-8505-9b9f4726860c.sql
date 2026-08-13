CREATE OR REPLACE FUNCTION public.admin_list_grading_slots()
RETURNS TABLE (
  id uuid,
  branch_id text,
  branch_name text,
  grading_date date,
  start_time time,
  end_time time,
  title text,
  location text,
  belt_levels text[],
  grading_product_ids uuid[],
  min_age integer,
  max_age integer,
  available_branch_ids text[],
  registration_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.branch_id,
    b.name,
    s.grading_date,
    s.start_time,
    s.end_time,
    s.title,
    s.location,
    s.belt_levels::text[],
    s.grading_product_ids::uuid[],
    s.min_age,
    s.max_age,
    s.available_branch_ids::text[],
    (
      SELECT COUNT(*) FROM public.grading_registrations r WHERE r.grading_slot_id = s.id
    ) + (
      SELECT COUNT(*) FROM public.grading_payment_submissions gs WHERE gs.resolved_grading_slot_id = s.id
    )
  FROM public.grading_slots s
  LEFT JOIN public.branches b ON b.id = s.branch_id
  ORDER BY s.grading_date DESC, s.start_time NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_grading_slot(
  p_id uuid,
  p_branch_id text,
  p_grading_date date,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_belt_levels text[] DEFAULT NULL,
  p_grading_product_ids uuid[] DEFAULT NULL,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_available_branch_ids text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_branch_id IS NULL OR p_grading_date IS NULL THEN
    RAISE EXCEPTION 'Branch and date are required';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.grading_slots (
      branch_id, grading_date, start_time, end_time, title, location,
      belt_levels, grading_product_ids, min_age, max_age, available_branch_ids
    ) VALUES (
      p_branch_id, p_grading_date, p_start_time, p_end_time, p_title, p_location,
      p_belt_levels, p_grading_product_ids, p_min_age, p_max_age, p_available_branch_ids
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.grading_slots SET
      branch_id = p_branch_id,
      grading_date = p_grading_date,
      start_time = p_start_time,
      end_time = p_end_time,
      title = p_title,
      location = p_location,
      belt_levels = p_belt_levels,
      grading_product_ids = p_grading_product_ids,
      min_age = p_min_age,
      max_age = p_max_age,
      available_branch_ids = p_available_branch_ids,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Grading event not found';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_grading_slot(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT (
    (SELECT COUNT(*) FROM public.grading_registrations r WHERE r.grading_slot_id = p_id)
    + (SELECT COUNT(*) FROM public.grading_payment_submissions gs WHERE gs.resolved_grading_slot_id = p_id)
  ) INTO v_count;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete: % registration(s) are linked to this event', v_count;
  END IF;

  DELETE FROM public.grading_slots WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_grading_slots() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_grading_slot(uuid, text, date, time, time, text, text, text[], uuid[], integer, integer, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_grading_slot(uuid) TO anon, authenticated;