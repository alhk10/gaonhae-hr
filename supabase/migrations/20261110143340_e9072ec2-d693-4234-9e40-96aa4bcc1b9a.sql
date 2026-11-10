CREATE OR REPLACE FUNCTION public._grading_records(p_student_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'student', (SELECT jsonb_build_object('belt', current_belt, 'dob', date_of_birth, 'last_dan_conversion_at', last_dan_conversion_at, 'pre_conversion_poom', pre_conversion_poom,
        'certificate_name', coalesce(nullif(trim(certificate_name),''), btrim(first_name||' '||coalesce(last_name,'')))) FROM students WHERE id = p_student_id),
    'history', coalesce((SELECT jsonb_agg(jsonb_build_object('id', h.id, 'date', h.grading_date, 'belt_from', h.belt_from, 'belt_to', h.belt_to, 'result', h.result,
        'scorecard', coalesce(r.scorecard, '[]'::jsonb), 'country', b.country,
        'fee_name', CASE WHEN h.belt_from IS NOT NULL AND h.belt_to IS NOT NULL AND lower(h.result) <> 'double' THEN h.belt_from || ' >> ' || h.belt_to
                         ELSE (SELECT ii.description FROM invoice_items ii WHERE ii.id = r.invoice_item_id) END)
        ORDER BY h.grading_date DESC, h.belt_from DESC)
      FROM student_grading_history h
      LEFT JOIN grading_registrations r ON r.id = h.grading_registration_id
      LEFT JOIN branches b ON b.id::text = h.branch_id::text
      WHERE h.student_id = p_student_id), '[]'::jsonb),
    'certificates', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'invoice_id', c.invoice_id, 'series', c.series, 'rank', c.rank, 'source', c.source, 'image_path', c.image_path, 'scan', c.scan, 'issue_date', c.issue_date, 'status', c.status, 'review_reason', c.review_reason, 'created_at', c.created_at) ORDER BY coalesce(c.issue_date, c.created_at::date) DESC) FROM student_certificates c WHERE c.student_id = p_student_id), '[]'::jsonb))
$function$;