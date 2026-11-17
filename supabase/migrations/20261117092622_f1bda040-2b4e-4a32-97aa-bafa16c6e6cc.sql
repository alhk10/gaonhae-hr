CREATE OR REPLACE FUNCTION public.match_student_by_identity(p_first_name text, p_last_name text, p_dob date, p_branch_id text, p_gender text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, first_name text, last_name text, current_belt text, status text, gender text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH norm AS (
    SELECT
      NULLIF(regexp_replace(COALESCE(p_phone,''), '\D', '', 'g'), '') AS phone_digits,
      NULLIF(lower(trim(COALESCE(p_email,''))), '') AS email_norm,
      NULLIF(lower(trim(COALESCE(p_gender,''))), '') AS gender_norm,
      CASE WHEN length(trim(COALESCE(p_first_name,''))) = 0 THEN ARRAY[]::text[]
           ELSE regexp_split_to_array(upper(trim(p_first_name)), '\s+') END AS first_tokens,
      CASE WHEN length(trim(COALESCE(p_last_name,''))) = 0 THEN ARRAY[]::text[]
           ELSE regexp_split_to_array(upper(trim(p_last_name)), '\s+') END AS last_tokens
  ), cand AS (
    SELECT s.*,
      COALESCE(regexp_split_to_array(upper(trim(COALESCE(s.first_name,''))), '\s+'), ARRAY[]::text[])
      || COALESCE(regexp_split_to_array(upper(trim(COALESCE(s.last_name,''))), '\s+'), ARRAY[]::text[]) AS s_tokens
    FROM public.students s WHERE s.branch_id = p_branch_id
  )
  SELECT c.id, c.first_name, c.last_name, c.current_belt, c.status, c.gender
  FROM cand c, norm
  WHERE (cardinality(norm.first_tokens) = 0 OR norm.first_tokens && c.s_tokens)
    AND (cardinality(norm.last_tokens) = 0 OR norm.last_tokens && c.s_tokens)
    AND (
      c.date_of_birth = p_dob
      OR (
        norm.gender_norm IS NOT NULL AND lower(trim(c.gender)) = norm.gender_norm
        AND (
          (norm.email_norm IS NOT NULL AND lower(trim(c.email)) = norm.email_norm)
          OR (norm.phone_digits IS NOT NULL AND (
                right(regexp_replace(COALESCE(c.phone,''), '\D','','g'), 8) = right(norm.phone_digits, 8)
             OR right(regexp_replace(COALESCE(c.emergency_contact_phone,''), '\D','','g'), 8) = right(norm.phone_digits, 8)
             OR right(regexp_replace(COALESCE(c.emergency_contact_2_phone,''), '\D','','g'), 8) = right(norm.phone_digits, 8)))
        )
      )
    )
  ORDER BY
    (upper(trim(COALESCE(c.first_name,''))) = array_to_string(norm.first_tokens,' ')) DESC,
    (SELECT count(*) FROM unnest(norm.first_tokens) t WHERE t = ANY(c.s_tokens)) DESC,
    (c.date_of_birth = p_dob) DESC,
    (cardinality(c.s_tokens)) ASC,
    c.created_at ASC
  LIMIT 1;
$function$;