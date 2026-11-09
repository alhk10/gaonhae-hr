DROP FUNCTION IF EXISTS public._dan_conversion_check(text, date, date, text, text, date);
CREATE FUNCTION public._dan_conversion_check(p_belt text, p_dob date, p_last date, p_from text, p_to text, p_as_of date DEFAULT current_date, p_pre_poom text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE v_age int; v_min int; v_req text; v_wait int; v_poom int;
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
  v_poom := nullif(substring(coalesce(p_pre_poom,'') from '^(\d)'),'')::int;
  IF coalesce(v_poom,0) < substring(p_to from '^(\d)')::int THEN
    RETURN 'Needs '||replace(p_to,'Dan','Poom')||' before conversion - take the grading instead';
  END IF;
  IF v_age < v_min THEN RETURN 'Available from the '||v_min||'th birthday'; END IF;
  IF p_last IS NULL THEN RETURN 'Previous Dan conversion date unknown - upload the '||v_req||' certificate'; END IF;
  IF p_last + make_interval(years => v_wait) > p_as_of THEN RETURN 'Wait until '||to_char(p_last + make_interval(years => v_wait),'DD/MM/YYYY'); END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public._invoice_items_conversion_check() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_meta jsonb; v_s record; v_reason text;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT metadata INTO v_meta FROM products WHERE id = NEW.product_id;
  IF v_meta->>'conversion_to' IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT DISTINCT FROM NEW.product_id THEN RETURN NEW; END IF;
  SELECT s.* INTO v_s FROM invoices i JOIN students s ON s.id = i.student_id WHERE i.id = NEW.invoice_id;
  IF v_s.id IS NULL THEN RETURN NEW; END IF;
  v_reason := _dan_conversion_check(v_s.current_belt, v_s.date_of_birth, v_s.last_dan_conversion_at, v_meta->>'conversion_from', v_meta->>'conversion_to', current_date, v_s.pre_conversion_poom);
  IF v_reason IS NOT NULL AND NOT (coalesce(NEW.metadata->>'conversion_override','') = 'true' AND public.is_superadmin(auth.jwt()->>'email')) THEN
    RAISE EXCEPTION 'Conversion not allowed: %', v_reason;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._grading_history_dan_date() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.belt_to IN ('2nd Dan','3rd Dan','4th Dan') AND NEW.grading_date IS NOT NULL
     AND coalesce(lower(NEW.result),'pass') NOT LIKE 'fail%' THEN
    UPDATE students SET last_dan_conversion_at = greatest(coalesce(last_dan_conversion_at, NEW.grading_date::date), NEW.grading_date::date)
     WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_grading_history_dan_date AFTER INSERT OR UPDATE OF belt_to, result, grading_date ON public.student_grading_history
  FOR EACH ROW EXECUTE FUNCTION public._grading_history_dan_date();