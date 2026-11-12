CREATE OR REPLACE FUNCTION public._term_paid_weeks(p_student_id uuid, p_term_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(CASE WHEN ii.metadata->>'payment_plan' = 'four_weeks'
      THEN COALESCE(NULLIF(ii.metadata->>'weeks','')::int, 4)
      ELSE COALESCE(NULLIF(ii.metadata->>'weeks','')::int, CEIL(COALESCE(ii.quantity,0))::int) END), 0)::int
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN products p ON p.id = ii.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE i.student_id = p_student_id AND pc.name = 'Classes'
    AND COALESCE(p.is_adhoc_lesson,false) = false
    AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
    AND i.status IN ('paid','verified');
$$;

CREATE OR REPLACE FUNCTION public._term_required_weeks(p_student_id uuid, p_term_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH t AS (
    SELECT start_date, end_date,
      COALESCE(total_weeks, GREATEST(1, CEIL((end_date - start_date + 1)::numeric / 7)::int)) tw
    FROM term_calendars WHERE id = p_term_id
  ), f AS (
    SELECT MIN(i.issue_date) d FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    JOIN products p ON p.id = ii.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE i.student_id = p_student_id AND pc.name = 'Classes'
      AND COALESCE(p.is_adhoc_lesson,false) = false
      AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
      AND i.status IN ('paid','verified')
  )
  SELECT GREATEST(1, LEAST(t.tw, CEIL((t.end_date - GREATEST(t.start_date, COALESCE(f.d, t.start_date)) + 1)::numeric / 7)::int))
  FROM t, f;
$$;

CREATE OR REPLACE FUNCTION public._term_payment_status(p_student_id uuid, p_term_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN p_term_id IS NULL THEN NULL
    WHEN (SELECT is_employee FROM students WHERE id = p_student_id) THEN 'paid'
    WHEN bool_or(i.status IN ('paid','verified')) THEN
      CASE WHEN public._term_paid_weeks(p_student_id, p_term_id) >= COALESCE(public._term_required_weeks(p_student_id, p_term_id), 1)
      THEN 'paid' ELSE 'unpaid' END
    WHEN count(i.id) > 0 THEN 'unpaid'
    ELSE 'none' END
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN products p ON p.id = ii.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE i.student_id = p_student_id AND pc.name = 'Classes'
    AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
    AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void');
$function$;

CREATE OR REPLACE FUNCTION public.get_public_chat_terms_for_student(p_session_id uuid, p_student_id uuid, p_branch_id text)
 RETURNS TABLE(term_id uuid, term_name text, start_date date, end_date date, total_weeks integer, is_paid boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT t.id, t.name, t.start_date, t.end_date, w.tw,
    public._term_paid_weeks(p_student_id, t.id) > 0
      AND public._term_paid_weeks(p_student_id, t.id) >= public._term_required_weeks(p_student_id, t.id)
  FROM public.term_calendars t
  CROSS JOIN LATERAL (SELECT COALESCE(t.total_weeks, GREATEST(1, CEIL((t.end_date - t.start_date + 1)::numeric / 7)::integer)) AS tw) w
  WHERE t.branch_id = p_branch_id AND COALESCE(t.is_active, true) = true AND t.end_date >= CURRENT_DATE
  ORDER BY t.start_date ASC LIMIT 6;
END;
$function$;

CREATE OR REPLACE FUNCTION public._fee_plan_label() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_tw int; v_cls boolean;
BEGIN
  IF NEW.metadata->>'payment_plan' = 'four_weeks' THEN
    IF coalesce(NEW.description,'') NOT ILIKE '%(4 weeks)%' THEN
      NEW.description := coalesce(NEW.description,'') || ' (4 weeks)';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.metadata ? 'term_id' AND NEW.product_id IS NOT NULL AND coalesce(NEW.description,'') !~* '\(\d+ weeks?\)' THEN
    SELECT pc.name = 'Classes' AND NOT COALESCE(p.is_adhoc_lesson,false) INTO v_cls
      FROM products p JOIN product_categories pc ON pc.id = p.category_id WHERE p.id = NEW.product_id;
    SELECT total_weeks INTO v_tw FROM term_calendars WHERE id = NULLIF(NEW.metadata->>'term_id','')::uuid;
    IF v_cls AND v_tw IS NOT NULL AND NEW.quantity IS NOT NULL AND NEW.quantity < v_tw THEN
      NEW.description := coalesce(NEW.description,'') || ' (' || NEW.quantity::int || CASE WHEN NEW.quantity::int = 1 THEN ' week)' ELSE ' weeks)' END;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fee_plan_label ON public.invoice_items;
CREATE TRIGGER trg_fee_plan_label BEFORE INSERT OR UPDATE OF description, metadata, quantity ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public._fee_plan_label();

REVOKE EXECUTE ON FUNCTION public._term_paid_weeks(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._term_required_weeks(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._fee_plan_label() FROM PUBLIC, anon, authenticated;

-- relabel existing part-term class lines
UPDATE public.invoice_items SET metadata = metadata
WHERE metadata ? 'term_id' AND coalesce(metadata->>'payment_plan','') <> 'four_weeks';