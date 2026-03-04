
-- Backfill valid_to on existing entitlements from term data in invoice_items metadata
UPDATE public.entitlements e
SET 
  valid_to = tc.end_date,
  valid_from = tc.start_date
FROM public.invoice_items ii
JOIN public.term_calendars tc ON tc.id = (ii.metadata->>'term_id')::uuid
WHERE e.source_id = ii.id
AND e.source_type = 'invoice_item'
AND e.valid_to IS NULL
AND ii.metadata->>'term_id' IS NOT NULL;
