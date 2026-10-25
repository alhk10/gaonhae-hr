CREATE OR REPLACE FUNCTION public._term_payment_status(p_student_id uuid, p_term_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_term_id IS NULL THEN NULL
    WHEN bool_or(i.status IN ('paid','verified')) THEN 'paid'
    WHEN count(i.id) > 0 THEN 'unpaid'
    ELSE 'none' END
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN products p ON p.id = ii.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE i.student_id = p_student_id AND pc.name = 'Classes'
    AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
    AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void');
$$;
REVOKE EXECUTE ON FUNCTION public._term_payment_status(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_attendance_week(p_password text, p_branch_id text, p_week_start date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_end date := p_week_start + 6; v_country text;
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  SELECT country INTO v_country FROM branches WHERE id = p_branch_id;
  RETURN jsonb_build_object(
    'slots', coalesce((SELECT jsonb_agg(to_jsonb(bt) ORDER BY bt.weekday, bt.start_time) FROM branch_timetables bt
                        WHERE bt.branch_id = p_branch_id AND bt.is_active), '[]'::jsonb),
    'holidays', coalesce((SELECT jsonb_agg(jsonb_build_object('date', h.date, 'name', h.name)) FROM public_holidays h
                        WHERE h.date BETWEEN p_week_start AND v_end AND (h.country IS NULL OR v_country IS NULL OR lower(h.country) = lower(v_country))), '[]'::jsonb),
    'terms', coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'start_date', t.start_date, 'end_date', t.end_date))
                        FROM term_calendars t WHERE t.branch_id = p_branch_id AND t.start_date <= v_end AND t.end_date >= p_week_start), '[]'::jsonb),
    'breaks', coalesce((SELECT jsonb_agg(jsonb_build_object('name', b.name, 'start_date', b.start_date, 'end_date', b.end_date))
                        FROM term_breaks b JOIN term_calendars t ON t.id = b.term_id
                        WHERE t.branch_id = p_branch_id AND b.start_date <= v_end AND b.end_date >= p_week_start), '[]'::jsonb),
    'bookings', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', lb.id, 'student_id', lb.student_id, 'timetable_id', lb.timetable_id, 'lesson_date', lb.lesson_date,
          'start_time', lb.start_time, 'end_time', lb.end_time, 'class_type', lb.class_type,
          'status', lb.status, 'source', lb.source, 'cancel_requested', lb.cancel_requested, 'notes', lb.notes,
          'created_at', lb.created_at,
          'student_name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))),
          'current_belt', s.current_belt, 'date_of_birth', s.date_of_birth, 'student_status', s.status,
          'term_payment', public._term_payment_status(lb.student_id, coalesce(lb.term_id,
              (SELECT t.id FROM term_calendars t WHERE t.branch_id = p_branch_id AND lb.lesson_date BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1))))
          ORDER BY s.first_name, s.last_name)
        FROM lesson_bookings lb JOIN students s ON s.id = lb.student_id
        WHERE lb.branch_id = p_branch_id AND lb.lesson_date BETWEEN p_week_start AND v_end AND lb.status <> 'rejected'), '[]'::jsonb),
    'requests', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', lb.id, 'lesson_date', lb.lesson_date, 'start_time', lb.start_time, 'end_time', lb.end_time,
          'class_type', lb.class_type, 'status', lb.status, 'cancel_requested', lb.cancel_requested, 'notes', lb.notes,
          'created_at', lb.created_at, 'student_id', lb.student_id,
          'student_name', upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')))) ORDER BY lb.created_at)
        FROM lesson_bookings lb JOIN students s ON s.id = lb.student_id
        WHERE lb.branch_id = p_branch_id AND lb.lesson_date >= current_date - 7
          AND (lb.status = 'requested' OR lb.cancel_requested)), '[]'::jsonb)
  );
END $$;