-- Step 1 — gather candidate (invoice_item, student, slot, term, belts) tuples
WITH candidate_items AS (
  SELECT
    ii.id            AS invoice_item_id,
    i.student_id     AS student_id,
    (ii.metadata->>'grading_slot_id')::uuid AS grading_slot_id,
    p.name           AS product_name,
    gs.grading_date  AS grading_date,
    COALESCE(gs.branch_id, i.branch_id) AS slot_branch_id
  FROM public.invoice_items ii
  JOIN public.invoices i           ON i.id = ii.invoice_id
  JOIN public.products p           ON p.id = ii.product_id
  JOIN public.product_categories pc ON pc.id = p.category_id
  JOIN public.grading_slots gs     ON gs.id = (ii.metadata->>'grading_slot_id')::uuid
  WHERE ii.metadata ? 'grading_slot_id'
    AND lower(pc.name) = 'grading'
    AND i.status IN ('draft','sent','unpaid','partial','partially_paid','overdue','paid','verified')
    AND NOT EXISTS (
      SELECT 1 FROM public.grading_registrations gr
      WHERE gr.invoice_item_id = ii.id
    )
),
resolved AS (
  SELECT
    ci.*,
    COALESCE(
      (SELECT tc.id FROM public.term_calendars tc
        WHERE tc.branch_id = ci.slot_branch_id
          AND tc.start_date <= ci.grading_date
          AND tc.end_date   >= ci.grading_date
        LIMIT 1),
      (SELECT tc.id FROM public.term_calendars tc
        WHERE tc.branch_id = ci.slot_branch_id
          AND tc.end_date <= ci.grading_date
        ORDER BY tc.end_date DESC
        LIMIT 1),
      (SELECT tc.id FROM public.term_calendars tc
        WHERE tc.branch_id = ci.slot_branch_id
          AND tc.start_date >= ci.grading_date
        ORDER BY tc.start_date ASC
        LIMIT 1)
    ) AS term_id
  FROM candidate_items ci
),
parsed AS (
  SELECT
    r.*,
    NULLIF(btrim(split_part(r.product_name, '>>', 1)), '') AS current_belt,
    NULLIF(btrim(split_part(r.product_name, '>>', 2)), '') AS target_belt
  FROM resolved r
  WHERE r.term_id IS NOT NULL
),
-- Step 2 — for each candidate, classify into UPDATE-target vs INSERT-target
classified AS (
  SELECT
    p.*,
    (SELECT gr.id FROM public.grading_registrations gr
       WHERE gr.student_id = p.student_id
         AND gr.grading_slot_id = p.grading_slot_id
         AND gr.invoice_item_id IS NULL
       LIMIT 1) AS existing_unlinked_id
  FROM parsed p
),
-- 2a — link the existing unlinked registration (resolves the unique constraint conflict)
upd AS (
  UPDATE public.grading_registrations gr
  SET
    invoice_item_id = c.invoice_item_id,
    term_id         = COALESCE(gr.term_id, c.term_id),
    current_belt    = COALESCE(NULLIF(gr.current_belt, ''), c.current_belt, 'White'),
    target_belt     = COALESCE(NULLIF(gr.target_belt, ''), c.target_belt, c.current_belt, 'White')
  FROM classified c
  WHERE gr.id = c.existing_unlinked_id
  RETURNING gr.id
)
-- 2b — insert net-new rows for candidates that had no matching unlinked registration
INSERT INTO public.grading_registrations
  (student_id, term_id, current_belt, target_belt, ready_for_grading,
   invoice_item_id, grading_slot_id, result, created_by)
SELECT
  c.student_id,
  c.term_id,
  COALESCE(c.current_belt, 'White'),
  COALESCE(c.target_belt, c.current_belt, 'White'),
  false,
  c.invoice_item_id,
  c.grading_slot_id,
  null,
  'system-backfill'
FROM classified c
WHERE c.existing_unlinked_id IS NULL;
