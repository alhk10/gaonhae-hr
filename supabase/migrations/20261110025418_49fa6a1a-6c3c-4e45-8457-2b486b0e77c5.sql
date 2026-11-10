CREATE TABLE public.student_progress_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  branch_id text,
  term_calendar_id uuid NOT NULL REFERENCES public.term_calendars(id) ON DELETE CASCADE,
  term_label text,
  report_date date NOT NULL DEFAULT current_date,
  belt_snapshot text,
  age_snapshot int,
  ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  grading_readiness text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, term_calendar_id)
);
GRANT ALL ON public.student_progress_cards TO service_role;
ALTER TABLE public.student_progress_cards ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_progress_cards_updated BEFORE UPDATE ON public.student_progress_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.progress_card_settings (
  branch_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.progress_card_settings TO service_role;
ALTER TABLE public.progress_card_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.access_progress_settings(p_password text, p_branch_id text, p_enabled boolean DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v boolean;
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  IF p_enabled IS NOT NULL THEN
    INSERT INTO progress_card_settings(branch_id, enabled, updated_at) VALUES (p_branch_id, p_enabled, now())
    ON CONFLICT (branch_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
  END IF;
  SELECT enabled INTO v FROM progress_card_settings WHERE branch_id = p_branch_id;
  RETURN coalesce(v, false);
END $$;

CREATE OR REPLACE FUNCTION public.access_progress_card_list(p_password text, p_branch_id text, p_term_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', student_id, 'term_id', term_calendar_id))
    FROM student_progress_cards WHERE term_calendar_id = ANY(p_term_ids)), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.access_progress_card_get(p_password text, p_student_id uuid, p_term_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_branch text; r jsonb;
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  SELECT to_jsonb(c) INTO r FROM student_progress_cards c WHERE student_id = p_student_id AND term_calendar_id = p_term_id;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.access_progress_card_upsert(p_password text, p_student_id uuid, p_term_id uuid, p_row jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_branch text; v_id uuid; v_ready text := p_row->>'grading_readiness';
BEGIN
  SELECT branch_id INTO v_branch FROM students WHERE id = p_student_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  PERFORM public._access_branch_check(p_password, v_branch);
  IF NOT EXISTS (SELECT 1 FROM term_calendars WHERE id = p_term_id) THEN RAISE EXCEPTION 'Term not found'; END IF;
  IF v_ready IS NOT NULL AND v_ready NOT IN ('yes','nearly','no') THEN RAISE EXCEPTION 'Invalid readiness'; END IF;
  INSERT INTO student_progress_cards(student_id, branch_id, term_calendar_id, term_label, report_date, belt_snapshot, age_snapshot, ratings, grading_readiness, comments)
  VALUES (p_student_id, v_branch, p_term_id, p_row->>'term_label', coalesce((p_row->>'report_date')::date, current_date),
    p_row->>'belt_snapshot', nullif(p_row->>'age_snapshot','')::int, coalesce(p_row->'ratings','{}'::jsonb), v_ready, nullif(p_row->>'comments',''))
  ON CONFLICT (student_id, term_calendar_id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id, term_label = EXCLUDED.term_label, report_date = EXCLUDED.report_date,
    belt_snapshot = EXCLUDED.belt_snapshot, age_snapshot = EXCLUDED.age_snapshot, ratings = EXCLUDED.ratings,
    grading_readiness = EXCLUDED.grading_readiness, comments = EXCLUDED.comments
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_progress_report(p_password text, p_branch_id text, p_term_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  RETURN coalesce((
    SELECT jsonb_agg(x ORDER BY x->>'name') FROM (
      SELECT jsonb_build_object(
        'name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))),
        'dob', s.date_of_birth,
        'term_label', c.term_label, 'report_date', c.report_date, 'belt', c.belt_snapshot, 'age', c.age_snapshot,
        'ratings', c.ratings, 'grading_readiness', c.grading_readiness, 'comments', c.comments,
        'paid_date', (SELECT max(coalesce(p.verified_at::date, p.payment_date))
           FROM grading_registrations gr JOIN invoice_items ii ON ii.id = gr.invoice_item_id
           JOIN invoices i ON i.id = ii.invoice_id AND lower(coalesce(i.status,'')) IN ('paid','verified')
           JOIN payments p ON p.invoice_id = i.id AND coalesce(p.verification_status,'') <> 'rejected'
           WHERE gr.student_id = c.student_id AND gr.term_id = c.term_calendar_id)
      ) x
      FROM student_progress_cards c JOIN students s ON s.id = c.student_id
      WHERE c.term_calendar_id = ANY(p_term_ids) AND c.branch_id = p_branch_id
    ) q), '[]'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION public.access_progress_settings(text,text,boolean), public.access_progress_card_list(text,text,uuid[]),
  public.access_progress_card_get(text,uuid,uuid), public.access_progress_card_upsert(text,uuid,uuid,jsonb),
  public.access_progress_report(text,text,uuid[]) TO anon, authenticated;