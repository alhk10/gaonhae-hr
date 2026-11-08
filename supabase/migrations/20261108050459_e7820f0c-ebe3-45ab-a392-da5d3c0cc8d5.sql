ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pre_conversion_poom text, ADD COLUMN IF NOT EXISTS last_dan_conversion_at date;

CREATE TABLE public.student_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_id uuid,
  series text NOT NULL DEFAULT 'stf',
  rank text,
  source text NOT NULL DEFAULT 'staff',
  image_path text,
  scan jsonb,
  issue_date date,
  status text NOT NULL DEFAULT 'awaiting_upload',
  review_reason text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.student_certificates TO authenticated;
GRANT ALL ON public.student_certificates TO service_role;
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin can view certificates" ON public.student_certificates FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.jwt()->>'email'));
CREATE INDEX ON public.student_certificates(student_id);
CREATE UNIQUE INDEX student_certificates_invoice_uniq ON public.student_certificates(invoice_id, rank) WHERE invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._student_certificates_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.series NOT IN ('stf','kukkiwon') THEN RAISE EXCEPTION 'Invalid certificate series'; END IF;
  IF NEW.source NOT IN ('staff','hello','invoice') THEN RAISE EXCEPTION 'Invalid certificate source'; END IF;
  IF NEW.status NOT IN ('awaiting_upload','pending','verified','rejected','manual') THEN RAISE EXCEPTION 'Invalid certificate status'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_student_certificates_validate BEFORE INSERT OR UPDATE ON public.student_certificates FOR EACH ROW EXECUTE FUNCTION public._student_certificates_validate();

-- Keep the Poom held before a manual belt change to Dan
CREATE OR REPLACE FUNCTION public._students_remember_poom() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.current_belt IS DISTINCT FROM OLD.current_belt AND OLD.current_belt LIKE '% Poom' AND NEW.current_belt LIKE '% Dan' THEN
    NEW.pre_conversion_poom := OLD.current_belt;
  END IF;
  IF NEW.current_belt LIKE '% Poom' THEN NEW.pre_conversion_poom := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_students_remember_poom BEFORE UPDATE OF current_belt ON public.students FOR EACH ROW EXECUTE FUNCTION public._students_remember_poom();

-- Eligibility: NULL = allowed, otherwise the reason
CREATE OR REPLACE FUNCTION public._dan_conversion_check(p_belt text, p_dob date, p_last date, p_from text, p_to text, p_as_of date DEFAULT current_date)
RETURNS text LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE v_age int; v_min int; v_req text; v_wait int;
BEGIN
  IF p_dob IS NULL THEN RETURN 'Date of birth is missing'; END IF;
  v_age := date_part('year', age(p_as_of, p_dob))::int;
  IF p_to = '1st Dan' THEN
    IF coalesce(p_belt,'') NOT IN ('1st Poom','2nd Poom','3rd Poom','4th Poom') THEN RETURN 'Student must hold a Poom rank'; END IF;
    IF p_from IS NOT NULL AND p_belt <> p_from THEN RETURN 'Student holds '||p_belt||', not '||p_from; END IF;
    IF v_age < 15 THEN RETURN 'Available from the 15th birthday'; END IF;
    RETURN NULL;
  END IF;
  SELECT m, r, w INTO v_min, v_req, v_wait FROM (VALUES ('2nd Dan',16,'1st Dan',1),('3rd Dan',18,'2nd Dan',2),('4th Dan',21,'3rd Dan',3)) t(d,m,r,w) WHERE d = p_to;
  IF v_min IS NULL THEN RETURN 'Unknown conversion'; END IF;
  IF coalesce(p_belt,'') <> v_req THEN RETURN v_req||' is required'; END IF;
  IF v_age < v_min THEN RETURN 'Available from the '||v_min||'th birthday'; END IF;
  IF p_last IS NULL THEN RETURN 'Previous Dan conversion date unknown - upload the '||v_req||' certificate'; END IF;
  IF p_last + make_interval(years => v_wait) > p_as_of THEN RETURN 'Wait until '||to_char(p_last + make_interval(years => v_wait),'DD/MM/YYYY'); END IF;
  RETURN NULL;
END $$;

-- Conversion products
INSERT INTO public.products (sku, name, description, category_id, base_price, tax_rate, is_active, is_service, metadata)
SELECT 'CONV-'||upper(replace(replace(f,' ',''),'st',''))||'-'||upper(replace(t,' ','')), n, n||' Conversion', 'c800f844-f217-4590-9ab0-9d26d058b235', 0, 9, true, true,
       jsonb_build_object('conversion_from', f, 'conversion_to', t)
FROM (VALUES
  ('STF 1st Poom > 1st Dan','1st Poom','1st Dan'),('STF 2nd Poom > 1st Dan','2nd Poom','1st Dan'),
  ('STF 3rd Poom > 1st Dan','3rd Poom','1st Dan'),('STF 4th Poom > 1st Dan','4th Poom','1st Dan'),
  ('STF 1st Dan > 2nd Dan','1st Dan','2nd Dan'),('STF 2nd Dan > 3rd Dan','2nd Dan','3rd Dan'),
  ('STF 3rd Dan > 4th Dan','3rd Dan','4th Dan')) v(n,f,t)
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.name = v.n);

-- Block ineligible conversion lines (superadmin may override)
CREATE OR REPLACE FUNCTION public._invoice_items_conversion_check() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_meta jsonb; v_s record; v_reason text;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT metadata INTO v_meta FROM products WHERE id = NEW.product_id;
  IF v_meta->>'conversion_to' IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT DISTINCT FROM NEW.product_id THEN RETURN NEW; END IF;
  SELECT s.* INTO v_s FROM invoices i JOIN students s ON s.id = i.student_id WHERE i.id = NEW.invoice_id;
  IF v_s.id IS NULL THEN RETURN NEW; END IF;
  v_reason := _dan_conversion_check(v_s.current_belt, v_s.date_of_birth, v_s.last_dan_conversion_at, v_meta->>'conversion_from', v_meta->>'conversion_to');
  IF v_reason IS NOT NULL AND NOT (coalesce(NEW.metadata->>'conversion_override','') = 'true' AND public.is_superadmin(auth.jwt()->>'email')) THEN
    RAISE EXCEPTION 'Conversion not allowed: %', v_reason;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_invoice_items_conversion_check BEFORE INSERT OR UPDATE OF product_id ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public._invoice_items_conversion_check();

-- Paid conversion invoice -> certificate needed
CREATE OR REPLACE FUNCTION public._invoice_conversion_paid() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('paid','verified') AND OLD.status IS DISTINCT FROM NEW.status AND NEW.student_id IS NOT NULL THEN
    INSERT INTO student_certificates (student_id, invoice_id, series, rank, source, status)
    SELECT NEW.student_id, NEW.id, 'stf', p.metadata->>'conversion_to', 'invoice', 'awaiting_upload'
      FROM invoice_items ii JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = NEW.id AND p.metadata->>'conversion_to' IS NOT NULL
    ON CONFLICT (invoice_id, rank) WHERE invoice_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_invoice_conversion_paid AFTER UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public._invoice_conversion_paid();

-- Access check helper: staff password scope or superadmin
CREATE OR REPLACE FUNCTION public._cert_can_manage(p_password text, p_student_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_branch text; v_scope text;
BEGIN
  SELECT branch_id::text INTO v_branch FROM students WHERE id = p_student_id;
  IF public.is_superadmin(auth.jwt()->>'email') THEN RETURN true; END IF;
  IF p_password IS NULL THEN RETURN false; END IF;
  v_scope := _access_scope(p_password);
  RETURN _scope_has(v_scope, v_branch);
END $$;

CREATE OR REPLACE FUNCTION public.access_can_manage_student(p_password text, p_student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public._cert_can_manage(p_password, p_student_id) $$;

-- Apply a verified/manual certificate
CREATE OR REPLACE FUNCTION public._cert_apply(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; v_country text;
BEGIN
  SELECT sc.*, b.country INTO c FROM student_certificates sc JOIN students s ON s.id = sc.student_id LEFT JOIN branches b ON b.id::text = s.branch_id::text WHERE sc.id = p_id;
  IF c.rank LIKE '% Dan' AND c.issue_date IS NOT NULL AND (c.series = 'stf' OR coalesce(c.country,'') <> 'Singapore') THEN
    UPDATE students SET last_dan_conversion_at = greatest(coalesce(last_dan_conversion_at, c.issue_date), c.issue_date) WHERE id = c.student_id;
  END IF;
  IF c.image_path IS NOT NULL AND (c.rank LIKE '% Poom' OR c.rank LIKE '% Dan') THEN
    UPDATE students SET poom_dan_certificate_url = c.image_path WHERE id = c.student_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.access_conversion_status(p_password text, p_student_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_scope text; v_super boolean := public.is_superadmin(auth.jwt()->>'email');
BEGIN
  IF NOT v_super THEN v_scope := _access_scope(p_password); END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'belt', s.current_belt, 'dob', s.date_of_birth,
      'last_dan_conversion_at', s.last_dan_conversion_at, 'pre_conversion_poom', s.pre_conversion_poom,
      'pending_certificate', EXISTS (SELECT 1 FROM student_certificates c WHERE c.student_id = s.id AND c.status IN ('awaiting_upload','pending'))))
    FROM students s WHERE s.id = ANY(p_student_ids) AND (v_super OR _scope_has(v_scope, s.branch_id::text))), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public._grading_records(p_student_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'student', (SELECT jsonb_build_object('belt', current_belt, 'dob', date_of_birth, 'last_dan_conversion_at', last_dan_conversion_at, 'pre_conversion_poom', pre_conversion_poom) FROM students WHERE id = p_student_id),
    'history', coalesce((SELECT jsonb_agg(jsonb_build_object('id', h.id, 'date', h.grading_date, 'belt_from', h.belt_from, 'belt_to', h.belt_to, 'result', h.result) ORDER BY h.grading_date DESC) FROM student_grading_history h WHERE h.student_id = p_student_id), '[]'::jsonb),
    'certificates', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'invoice_id', c.invoice_id, 'series', c.series, 'rank', c.rank, 'source', c.source, 'image_path', c.image_path, 'scan', c.scan, 'issue_date', c.issue_date, 'status', c.status, 'review_reason', c.review_reason, 'created_at', c.created_at) ORDER BY coalesce(c.issue_date, c.created_at::date) DESC) FROM student_certificates c WHERE c.student_id = p_student_id), '[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public._grading_records(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_student_grading_records(p_password text, p_student_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT _cert_can_manage(p_password, p_student_id) THEN RAISE EXCEPTION 'Not allowed for this student'; END IF;
  RETURN _grading_records(p_student_id);
END $$;

CREATE OR REPLACE FUNCTION public.hello_student_grading_records(p_session_id uuid, p_student_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT coalesce(_validate_public_chat_session(p_session_id, p_student_id, NULL), false) THEN RAISE EXCEPTION 'Invalid student session'; END IF;
  RETURN _grading_records(p_student_id) - 'student';
END $$;

CREATE OR REPLACE FUNCTION public.access_pending_certificates(p_password text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_scope text; v_super boolean := public.is_superadmin(auth.jwt()->>'email');
BEGIN
  IF NOT v_super THEN v_scope := _access_scope(p_password); END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'student_id', c.student_id, 'student_name', trim(s.first_name||' '||coalesce(s.last_name,'')),
      'branch', b.name, 'series', c.series, 'rank', c.rank, 'source', c.source, 'status', c.status, 'image_path', c.image_path, 'scan', c.scan,
      'issue_date', c.issue_date, 'invoice_id', c.invoice_id, 'created_at', c.created_at) ORDER BY c.created_at)
    FROM student_certificates c JOIN students s ON s.id = c.student_id LEFT JOIN branches b ON b.id::text = s.branch_id::text
   WHERE c.status IN ('awaiting_upload','pending') AND (v_super OR _scope_has(v_scope, s.branch_id::text))), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.access_review_certificate(p_password text, p_id uuid, p_approve boolean, p_series text DEFAULT NULL, p_rank text DEFAULT NULL, p_issue_date date DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; v_by text := coalesce(auth.jwt()->>'email', 'access');
BEGIN
  SELECT * INTO c FROM student_certificates WHERE id = p_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Certificate not found'; END IF;
  IF NOT _cert_can_manage(p_password, c.student_id) THEN RAISE EXCEPTION 'Not allowed for this student'; END IF;
  IF c.image_path IS NULL THEN RAISE EXCEPTION 'Upload the certificate first'; END IF;
  IF NOT p_approve AND coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'Enter a reason'; END IF;
  UPDATE student_certificates SET
    series = coalesce(p_series, series), rank = coalesce(p_rank, rank), issue_date = coalesce(p_issue_date, issue_date),
    status = CASE WHEN p_approve THEN 'manual' ELSE 'rejected' END, review_reason = p_reason, reviewed_by = v_by, reviewed_at = now()
  WHERE id = p_id;
  IF p_approve THEN
    IF (SELECT issue_date FROM student_certificates WHERE id = p_id) IS NULL THEN RAISE EXCEPTION 'Enter the Date of Issue'; END IF;
    PERFORM _cert_apply(p_id);
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public._cert_apply(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._cert_apply(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.access_can_manage_student(text, uuid), public.access_conversion_status(text, uuid[]), public.access_student_grading_records(text, uuid),
  public.hello_student_grading_records(uuid, uuid), public.access_pending_certificates(text), public.access_review_certificate(text, uuid, boolean, text, text, date, text) TO anon, authenticated;