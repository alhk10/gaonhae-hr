-- Strip leading "0" trunk prefix after country code from all party phone/whatsapp numbers
-- Pattern: "+CC 0XXXXX" -> "+CC XXXXX" (E164-style)
-- Only touches rows that start with a recognized country code followed by an optional space and a 0

DO $$
DECLARE
  pattern_match text := '^\+(65|61|60|62|86|91|63|66|84|81|82|44|64|49|33|39|34|95|971|966|852|886|855|856|1) ?0';
  pattern_replace text := '^(\+(?:65|61|60|62|86|91|63|66|84|81|82|44|64|49|33|39|34|95|971|966|852|886|855|856|1)) ?0';
BEGIN
  -- students
  EXECUTE format('UPDATE public.students SET phone = regexp_replace(phone, %L, %L) WHERE phone ~ %L', pattern_replace, '\1 ', pattern_match);
  EXECUTE format('UPDATE public.students SET whatsapp = regexp_replace(whatsapp, %L, %L) WHERE whatsapp ~ %L', pattern_replace, '\1 ', pattern_match);
  EXECUTE format('UPDATE public.students SET emergency_contact_phone = regexp_replace(emergency_contact_phone, %L, %L) WHERE emergency_contact_phone ~ %L', pattern_replace, '\1 ', pattern_match);
  EXECUTE format('UPDATE public.students SET emergency_contact_2_phone = regexp_replace(emergency_contact_2_phone, %L, %L) WHERE emergency_contact_2_phone ~ %L', pattern_replace, '\1 ', pattern_match);

  -- student_registrations
  EXECUTE format('UPDATE public.student_registrations SET phone = regexp_replace(phone, %L, %L) WHERE phone ~ %L', pattern_replace, '\1 ', pattern_match);
  EXECUTE format('UPDATE public.student_registrations SET whatsapp = regexp_replace(whatsapp, %L, %L) WHERE whatsapp ~ %L', pattern_replace, '\1 ', pattern_match);
  EXECUTE format('UPDATE public.student_registrations SET emergency_contact_phone = regexp_replace(emergency_contact_phone, %L, %L) WHERE emergency_contact_phone ~ %L', pattern_replace, '\1 ', pattern_match);
  EXECUTE format('UPDATE public.student_registrations SET emergency_contact_2_phone = regexp_replace(emergency_contact_2_phone, %L, %L) WHERE emergency_contact_2_phone ~ %L', pattern_replace, '\1 ', pattern_match);

  -- student_emergency_contacts
  EXECUTE format('UPDATE public.student_emergency_contacts SET phone = regexp_replace(phone, %L, %L) WHERE phone ~ %L', pattern_replace, '\1 ', pattern_match);

  -- employees (no rows currently match, but apply for safety)
  EXECUTE format('UPDATE public.employees SET phone = regexp_replace(phone, %L, %L) WHERE phone ~ %L', pattern_replace, '\1 ', pattern_match);
END $$;