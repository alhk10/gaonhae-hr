DROP FUNCTION IF EXISTS public.get_public_student_directory(text,text,text);
CREATE FUNCTION public.get_public_student_directory(p_search text DEFAULT NULL::text, p_branch_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, student_number text, name text, first_name text, last_name text, current_belt text, branch_id text, branch_name text, status text, email text, phone text, date_of_birth date, term_name text, class_type text, tier_name text, enrolled_weekdays text[], invoice_status text, invoice_total numeric, invoice_balance numeric, credit_balance numeric, is_employee boolean, class_group text, display_name text, certificate_name text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id, t.name
    FROM term_calendars t WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ),
  enrol AS (
    SELECT lb.student_id,
      (array_agg(lb.class_type ORDER BY lb.lesson_date DESC))[1] AS class_type,
      NULL::text AS tier_name,
      array_agg(DISTINCT trim(to_char(lb.lesson_date,'Day')))::text[] AS enrolled_weekdays,
      ct.name AS term_name
    FROM lesson_bookings lb
    JOIN current_terms ct ON ct.id = lb.term_id
    WHERE lb.status IN ('booked','attended','absent')
    GROUP BY lb.student_id, ct.name
  ),
  grp AS (
    SELECT lb.student_id,
      CASE
        WHEN bool_or(lb.class_type ILIKE 'Team Gaonhae%') THEN 'Team Gaonhae'
        ELSE (array_agg(
          CASE WHEN lb.class_type ILIKE 'Little Gaonhae%' THEN 'Little Gaonhae'
               WHEN lb.class_type ILIKE 'Kids%' THEN 'Kids'
               WHEN lb.class_type ILIKE 'Teens%' THEN 'Teens & Adults' END
          ORDER BY lb.lesson_date DESC) FILTER (WHERE lb.class_type ILIKE ANY (ARRAY['Little Gaonhae%','Kids%','Teens%'])))[1]
      END AS class_group
    FROM lesson_bookings lb
    WHERE lb.status = 'attended' AND lb.lesson_date >= current_date - 90
    GROUP BY lb.student_id
  ),
  inv AS (
    SELECT DISTINCT ON (i.student_id) i.student_id, i.status, i.total_amount, i.balance_due
    FROM invoices i
    JOIN current_terms ct ON ct.branch_id = i.branch_id
    WHERE lower(coalesce(i.status,'')) NOT IN ('cancelled')
      AND i.issue_date <= now()::date
      AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
          AND (ii.metadata->>'term_id' = ct.id::text
            OR (ii.metadata ? 'term_ids' AND ii.metadata->'term_ids' ? ct.id::text)))
    ORDER BY i.student_id, i.issue_date DESC NULLS LAST, i.created_at DESC
  ),
  credits AS (
    SELECT c.student_id, COALESCE(SUM(c.amount),0) AS balance FROM student_credits c GROUP BY c.student_id
  )
  SELECT s.id, s.student_number,
    UPPER(coalesce(NULLIF(btrim(s.display_name),''), NULLIF(concat_ws(' ', s.first_name, s.last_name),''),''))::text,
    s.first_name, s.last_name, s.current_belt, s.branch_id, b.name, lower(s.status), s.email, s.phone, s.date_of_birth,
    e.term_name, e.class_type, e.tier_name, e.enrolled_weekdays,
    i.status, i.total_amount, i.balance_due, COALESCE(cr.balance, 0),
    s.is_employee, g.class_group, s.display_name, s.certificate_name
  FROM students s
  LEFT JOIN branches b ON b.id = s.branch_id
  LEFT JOIN enrol e ON e.student_id = s.id
  LEFT JOIN grp g ON g.student_id = s.id
  LEFT JOIN inv i ON i.student_id = s.id
  LEFT JOIN credits cr ON cr.student_id = s.id
  WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_status IS NULL OR lower(s.status) = lower(p_status))
    AND (p_search IS NULL OR btrim(p_search) = '' OR
      concat_ws(' ', s.first_name, s.last_name) ILIKE '%' || btrim(p_search) || '%' OR
      concat_ws(' ', s.last_name, s.first_name) ILIKE '%' || btrim(p_search) || '%' OR
      coalesce(s.display_name,'') ILIKE '%' || btrim(p_search) || '%' OR
      coalesce(s.email,'') ILIKE '%' || btrim(p_search) || '%')
  ORDER BY s.is_employee, lower(s.status) = 'active' DESC, s.first_name, s.last_name
  LIMIT 200;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_student_directory(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_student_names(p_student_id uuid, p_display_name text, p_certificate_name text, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old students%ROWTYPE; v_d text; v_c text;
BEGIN
  SELECT * INTO v_old FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  v_d := CASE WHEN p_display_name IS NULL THEN v_old.display_name ELSE NULLIF(upper(btrim(p_display_name)),'') END;
  v_c := CASE WHEN p_certificate_name IS NULL THEN v_old.certificate_name ELSE NULLIF(upper(btrim(p_certificate_name)),'') END;
  UPDATE students SET display_name = v_d, certificate_name = v_c, updated_at = now(), updated_by = p_actor WHERE id = p_student_id;
  IF v_d IS DISTINCT FROM v_old.display_name THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by) VALUES (p_student_id,'update','display_name',v_old.display_name,v_d,p_actor);
  END IF;
  IF v_c IS DISTINCT FROM v_old.certificate_name THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by) VALUES (p_student_id,'update','certificate_name',v_old.certificate_name,v_c,p_actor);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_update_student_names(uuid,text,text,text) TO anon, authenticated;