CREATE OR REPLACE FUNCTION public._cert_apply(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record;
BEGIN
  SELECT sc.*, b.country INTO c FROM student_certificates sc JOIN students s ON s.id = sc.student_id LEFT JOIN branches b ON b.id::text = s.branch_id::text WHERE sc.id = p_id;
  IF c.invoice_id IS NOT NULL AND c.rank LIKE '% Dan' THEN
    UPDATE students SET current_belt = c.rank WHERE id = c.student_id AND current_belt IS DISTINCT FROM c.rank;
  END IF;
  IF c.rank LIKE '% Dan' AND c.issue_date IS NOT NULL AND (c.series = 'stf' OR coalesce(c.country,'') <> 'Singapore') THEN
    UPDATE students SET last_dan_conversion_at = greatest(coalesce(last_dan_conversion_at, c.issue_date), c.issue_date) WHERE id = c.student_id;
  END IF;
  IF c.image_path IS NOT NULL AND (c.rank LIKE '% Poom' OR c.rank LIKE '% Dan') THEN
    UPDATE students SET poom_dan_certificate_url = c.image_path WHERE id = c.student_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._cert_apply(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._cert_apply(uuid) TO service_role;