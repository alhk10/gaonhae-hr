CREATE OR REPLACE FUNCTION public._grading_effective_belts(p_reg_id uuid, OUT belt_from text, OUT belt_to text)
 RETURNS record LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r grading_registrations%ROWTYPE; v_desc text; v_inv uuid; v_m text[]; v_next text; i int := 0;
BEGIN
  SELECT * INTO r FROM grading_registrations WHERE id = p_reg_id;
  belt_from := r.current_belt; belt_to := r.target_belt;
  IF r.invoice_item_id IS NOT NULL THEN
    SELECT ii.description, ii.invoice_id INTO v_desc, v_inv FROM invoice_items ii WHERE ii.id = r.invoice_item_id;
    v_m := regexp_match(coalesce(v_desc,''), '^\s*(.+?)\s*>>\s*(.+?)\s*$');
    IF v_m IS NOT NULL THEN belt_from := initcap(v_m[1]); belt_to := initcap(v_m[2]); END IF;
    -- Combined Foundation gradings on one invoice chain (F1>>F2 + F2>>F3 + F3>>White => F1>>White)
    IF v_m IS NOT NULL AND belt_from ILIKE 'Foundation%' THEN
      LOOP
        i := i + 1; EXIT WHEN i > 5;
        SELECT initcap(m[2]) INTO v_next FROM invoice_items ii2,
          LATERAL regexp_match(ii2.description, '^\s*(.+?)\s*>>\s*(.+?)\s*$') m
          WHERE ii2.invoice_id = v_inv AND ii2.id <> r.invoice_item_id
            AND lower(trim(m[1])) = lower(belt_to) AND belt_to ILIKE 'Foundation%'
          LIMIT 1;
        EXIT WHEN v_next IS NULL;
        belt_to := v_next; v_next := NULL;
      END LOOP;
    END IF;
  END IF;
  IF lower(coalesce(r.result,'')) = 'double' AND _next_belt(belt_to) IS NOT NULL THEN
    belt_to := _next_belt(belt_to);
  END IF;
END $function$;

-- Repair affected combined Foundation registrations
UPDATE grading_registrations g SET result = g.result
WHERE lower(coalesce(g.result,'')) IN ('pass','double')
  AND g.invoice_item_id IN (SELECT ii.id FROM invoice_items ii WHERE ii.invoice_id IN ('f56c821e-c67d-45cd-8440-cde31643ed21','059584ae-f73c-435d-bb5e-843c07df777f'));