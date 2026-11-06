CREATE OR REPLACE FUNCTION public._perth_validate_comp_events()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE e text; sg int; eg int;
BEGIN
  IF NEW.comp_events IS NULL OR cardinality(NEW.comp_events) = 0 THEN RETURN NEW; END IF;
  SELECT array_agg(code ORDER BY first_position) INTO NEW.comp_events
  FROM (
    SELECT CASE value WHEN 'g10' THEN 'g9' WHEN 'g8' THEN 'g7' ELSE value END AS code, min(position) AS first_position
    FROM unnest(NEW.comp_events) WITH ORDINALITY AS entry(value, position)
    GROUP BY CASE value WHEN 'g10' THEN 'g9' WHEN 'g8' THEN 'g7' ELSE value END
  ) normalized;
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
END $function$;
UPDATE public.perth_event_registrations
SET comp_events = array_replace(array_replace(comp_events, 'g10', 'g9'), 'g8', 'g7')
WHERE comp_events && ARRAY['g10','g8']::text[];