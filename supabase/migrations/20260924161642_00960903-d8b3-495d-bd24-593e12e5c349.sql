CREATE OR REPLACE FUNCTION public._sur_reviewer(p_actor text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN EXISTS(SELECT 1 FROM public.employees e WHERE e.id::text = p_actor) THEN p_actor ELSE NULL END
$$;
REVOKE EXECUTE ON FUNCTION public._sur_reviewer(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_public_student_update_request(p_id uuid, p_actor text DEFAULT 'access'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  u public.student_update_requests%ROWTYPE;
  v_changes jsonb; v_applied jsonb := '{}'::jsonb; k text; v text;
BEGIN
  SELECT * INTO u FROM public.student_update_requests WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF lower(coalesce(u.status,'pending')) <> 'pending' THEN RAISE EXCEPTION 'This request has already been reviewed'; END IF;
  v_changes := CASE WHEN jsonb_typeof(u.requested_changes::jsonb) = 'object' THEN u.requested_changes::jsonb ELSE '{}'::jsonb END;
  FOR k, v IN SELECT key, value #>> '{}' FROM jsonb_each(v_changes) LOOP
    IF k = 'first_name' THEN UPDATE public.students SET first_name = upper(btrim(v)) WHERE id = u.student_id;
    ELSIF k = 'last_name' THEN UPDATE public.students SET last_name = upper(btrim(coalesce(v,''))) WHERE id = u.student_id;
    ELSIF k = 'certificate_name' THEN UPDATE public.students SET certificate_name = upper(btrim(coalesce(v,''))) WHERE id = u.student_id;
    ELSIF k = 'display_name' THEN UPDATE public.students SET display_name = upper(btrim(coalesce(v,''))) WHERE id = u.student_id;
    ELSIF k = 'preferred_name' THEN UPDATE public.students SET preferred_name = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSIF k = 'date_of_birth' THEN UPDATE public.students SET date_of_birth = nullif(btrim(coalesce(v,'')),'')::date WHERE id = u.student_id;
    ELSIF k = 'gender' THEN UPDATE public.students SET gender = nullif(lower(btrim(coalesce(v,''))),'') WHERE id = u.student_id;
    ELSIF k = 'email' THEN UPDATE public.students SET email = nullif(lower(btrim(coalesce(v,''))),'') WHERE id = u.student_id;
    ELSIF k = 'phone' THEN UPDATE public.students SET phone = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSIF k = 'whatsapp' THEN UPDATE public.students SET whatsapp = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSIF k = 'current_belt' THEN UPDATE public.students SET current_belt = nullif(btrim(coalesce(v,'')),'') WHERE id = u.student_id;
    ELSE CONTINUE; END IF;
    v_applied := v_applied || jsonb_build_object(k, v);
  END LOOP;
  UPDATE public.students SET updated_by = p_actor, updated_at = now() WHERE id = u.student_id;
  INSERT INTO public.student_change_logs (student_id, action, changes, changed_by)
  VALUES (u.student_id, 'update', jsonb_build_object('source','access_summary_approval','request_id', p_id, 'applied', v_applied), p_actor);
  UPDATE public.student_update_requests
     SET status = 'approved', reviewed_by = public._sur_reviewer(p_actor), reviewed_at = now(),
         review_notes = concat_ws(' | ', review_notes, 'Approved by ' || coalesce(p_actor,'access'))
   WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_public_student_update_request(p_id uuid, p_reason text DEFAULT NULL::text, p_actor text DEFAULT 'access'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_update_requests
     SET status = 'rejected', reviewed_by = public._sur_reviewer(p_actor), reviewed_at = now(),
         review_notes = concat_ws(' | ', nullif(btrim(coalesce(p_reason,'')),''), 'Rejected by ' || coalesce(p_actor,'access'))
   WHERE id = p_id AND lower(coalesce(status,'pending')) = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already reviewed'; END IF;
END;
$function$;

-- Prevent duplicate / no-op pending requests going forward
CREATE OR REPLACE FUNCTION public.trg_sur_dedupe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.students%ROWTYPE; k text; v text; diff boolean := false;
BEGIN
  IF lower(coalesce(NEW.status,'pending')) <> 'pending' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.student_update_requests r WHERE r.student_id=NEW.student_id
             AND lower(coalesce(r.status,'pending'))='pending' AND r.requested_changes::jsonb = NEW.requested_changes::jsonb) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO s FROM public.students WHERE id = NEW.student_id;
  IF FOUND AND jsonb_typeof(NEW.requested_changes::jsonb)='object' THEN
    FOR k, v IN SELECT key, value #>> '{}' FROM jsonb_each(NEW.requested_changes::jsonb) LOOP
      IF coalesce(lower(btrim(v)),'') IS DISTINCT FROM coalesce(lower(btrim(to_jsonb(s)->>k)),'') THEN diff := true; END IF;
    END LOOP;
    IF NOT diff THEN RETURN NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sur_dedupe ON public.student_update_requests;
CREATE TRIGGER sur_dedupe BEFORE INSERT ON public.student_update_requests FOR EACH ROW EXECUTE FUNCTION public.trg_sur_dedupe();