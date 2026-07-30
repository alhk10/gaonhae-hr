CREATE OR REPLACE FUNCTION public.get_public_grading_dates()
RETURNS TABLE(grading_date date, entries bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.grading_date, SUM(d.entries)::bigint AS entries
  FROM (
    SELECT gs.grading_date, COUNT(*)::bigint AS entries
    FROM public.grading_registrations gr
    JOIN public.grading_slots gs ON gs.id = gr.grading_slot_id
    WHERE gs.grading_date IS NOT NULL
    GROUP BY gs.grading_date

    UNION ALL

    SELECT gs.grading_date, COUNT(*)::bigint AS entries
    FROM public.grading_payment_submissions gps
    JOIN public.grading_slots gs ON gs.id = gps.resolved_grading_slot_id
    WHERE gps.status <> 'rejected'
      AND gps.matched_invoice_id IS NULL
      AND gs.grading_date IS NOT NULL
    GROUP BY gs.grading_date
  ) d
  GROUP BY d.grading_date
  ORDER BY d.grading_date DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_grading_dates() TO anon, authenticated;