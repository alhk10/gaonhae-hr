UPDATE public.perth_event_registrations SET comp_events = '{g1}' WHERE upper(first_name)='LEAH' AND upper(last_name)='GIAM' AND grade='g1' AND comp_events='{pd_t8}';

CREATE OR REPLACE FUNCTION public._perth_validate_comp_events()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE e text; sg int; eg int;
BEGIN
  IF NEW.comp_events IS NULL OR cardinality(NEW.comp_events) = 0 THEN RETURN NEW; END IF;
  IF NEW.gender IS NULL OR lower(NEW.gender) NOT IN ('male','female') THEN
    RAISE EXCEPTION 'Gender (male or female) is required for competition entries';
  END IF;
  FOREACH e IN ARRAY NEW.comp_events LOOP
    IF NEW.grade = 'poomdan' THEN
      IF e NOT LIKE 'pd\_%' THEN RAISE EXCEPTION 'Poom/Dan holders can only enter Poom/Dan events'; END IF;
    ELSE
      IF e LIKE 'pd\_%' THEN RAISE EXCEPTION 'Geup students cannot enter Poom/Dan events'; END IF;
      sg := nullif(regexp_replace(coalesce(NEW.grade,''), '\D', '', 'g'), '')::int;
      eg := nullif(regexp_replace(e, '\D', '', 'g'), '')::int;
      IF sg IS NULL OR eg IS NULL OR eg > sg THEN RAISE EXCEPTION 'Event % is below the competitor''s grade', e; END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS perth_validate_comp_events ON public.perth_event_registrations;
CREATE TRIGGER perth_validate_comp_events BEFORE INSERT OR UPDATE OF comp_events, grade, gender
ON public.perth_event_registrations FOR EACH ROW EXECUTE FUNCTION public._perth_validate_comp_events();