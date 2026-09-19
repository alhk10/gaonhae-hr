
CREATE OR REPLACE FUNCTION public.public_find_duplicate_students(
  p_criteria jsonb DEFAULT '{"name": true, "email": true, "phone": true, "dob_name": true}'::jsonb
)
RETURNS TABLE(
  group_key text,
  match_reason text,
  student_id uuid,
  last_activity_at timestamptz,
  student_number text,
  first_name text,
  last_name text,
  email text,
  phone text,
  date_of_birth date,
  current_belt text,
  branch_id text,
  status text,
  invoices_count int,
  enrollments_count int,
  attendance_count int,
  grading_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT s.id,
           upper(trim(coalesce(s.first_name,''))) || ' ' || upper(trim(coalesce(s.last_name,''))) AS norm_name,
           right(regexp_replace(coalesce(s.phone,''), '\D', '', 'g'), 8) AS norm_phone,
           lower(trim(coalesce(s.email,''))) AS norm_email,
           s.date_of_birth AS dob,
           greatest(
             s.updated_at,
             coalesce((SELECT max(i.updated_at) FROM invoices i WHERE i.student_id = s.id), s.created_at),
             coalesce((SELECT max(ca.class_date)::timestamptz FROM class_attendance ca WHERE ca.student_id = s.id), s.created_at),
             coalesce((SELECT max(e.updated_at) FROM student_class_enrollments e WHERE e.student_id = s.id), s.created_at),
             coalesce((SELECT max(g.created_at) FROM grading_registrations g WHERE g.student_id = s.id), s.created_at)
           ) AS last_act
    FROM students s
  ),
  grouped AS (
    SELECT 'name:'||b.norm_name AS gk, 'name' AS reason, b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'name')::boolean,false) AND length(trim(b.norm_name)) > 1
      AND b.norm_name IN (SELECT norm_name FROM base GROUP BY norm_name HAVING count(*) > 1)
    UNION ALL
    SELECT 'phone:'||b.norm_phone, 'phone', b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'phone')::boolean,false) AND length(b.norm_phone) = 8
      AND b.norm_phone IN (SELECT norm_phone FROM base WHERE length(norm_phone)=8 GROUP BY norm_phone HAVING count(*) > 1)
    UNION ALL
    SELECT 'email:'||b.norm_email, 'email', b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'email')::boolean,false) AND b.norm_email <> ''
      AND b.norm_email IN (SELECT norm_email FROM base WHERE norm_email<>'' GROUP BY norm_email HAVING count(*) > 1)
    UNION ALL
    SELECT 'dob:'||b.dob::text||'|'||b.norm_name, 'dob_name', b.id, b.last_act
    FROM base b
    WHERE coalesce((p_criteria->>'dob_name')::boolean,false) AND b.dob IS NOT NULL AND length(trim(b.norm_name))>1
      AND (b.dob, b.norm_name) IN (SELECT dob, norm_name FROM base WHERE dob IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1)
  )
  SELECT g.gk, g.reason, g.id, g.last_act,
         s.student_number, s.first_name, s.last_name, s.email, s.phone,
         s.date_of_birth, s.current_belt, s.branch_id, s.status,
         (SELECT count(*)::int FROM invoices i WHERE i.student_id = s.id),
         (SELECT count(*)::int FROM student_class_enrollments e WHERE e.student_id = s.id),
         (SELECT count(*)::int FROM class_attendance ca WHERE ca.student_id = s.id),
         (SELECT count(*)::int FROM grading_registrations gr WHERE gr.student_id = s.id)
  FROM grouped g
  JOIN students s ON s.id = g.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.public_find_duplicate_students(jsonb) TO anon, authenticated, service_role;
