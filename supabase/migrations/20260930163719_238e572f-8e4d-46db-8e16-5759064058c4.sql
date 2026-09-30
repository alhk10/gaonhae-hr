CREATE OR REPLACE FUNCTION public.update_public_pending_approval(p_kind text, p_id uuid, p_details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_kind = 'registration' THEN
    UPDATE public.student_registrations r SET
      first_name = COALESCE(p_details->>'first_name', r.first_name),
      last_name = COALESCE(p_details->>'last_name', r.last_name),
      date_of_birth = COALESCE(NULLIF(p_details->>'date_of_birth', ''), r.date_of_birth::text)::date,
      gender = COALESCE(NULLIF(p_details->>'gender', ''), r.gender),
      email = COALESCE(NULLIF(p_details->>'email', ''), r.email),
      phone = COALESCE(NULLIF(p_details->>'phone', ''), r.phone),
      whatsapp = COALESCE(NULLIF(p_details->>'whatsapp', ''), r.whatsapp),
      current_belt = COALESCE(NULLIF(p_details->>'current_belt', ''), r.current_belt),
      emergency_contact_name = COALESCE(NULLIF(p_details->>'emergency_contact_name', ''), r.emergency_contact_name),
      emergency_contact_phone = COALESCE(NULLIF(p_details->>'emergency_contact_phone', ''), r.emergency_contact_phone),
      medical_conditions = COALESCE(NULLIF(p_details->>'medical_conditions', ''), r.medical_conditions),
      referral_source = COALESCE(NULLIF(p_details->>'referral_source', ''), r.referral_source)
    WHERE r.id = p_id AND lower(coalesce(r.status, 'pending')) = 'pending';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pending registration not found or already actioned';
    END IF;
  ELSIF p_kind = 'update_request' THEN
    UPDATE public.student_update_requests u SET
      requested_changes = (
        CASE WHEN jsonb_typeof(u.requested_changes::jsonb) = 'object'
             THEN u.requested_changes::jsonb ELSE '{}'::jsonb END
      ) || COALESCE(p_details, '{}'::jsonb)
    WHERE u.id = p_id AND lower(coalesce(u.status, 'pending')) = 'pending';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pending update request not found or already actioned';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown kind: %', p_kind;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_public_pending_approval(text, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_public_pending_approval(text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_public_pending_approval(text, uuid, jsonb) TO service_role;