-- Repair Rory McIntosh's grading invoice item metadata and registration
-- to reflect the actual Term 1 2026 Foundation grading slot at Morley.

UPDATE public.invoice_items
SET metadata = jsonb_build_object(
  'grading_slot_id', 'fdd526dd-3f40-4140-93bb-cfcc1f4ff5f3'
)
WHERE id = '9b10c4bd-0d3f-462b-b59b-18e0fa733fb2';

UPDATE public.grading_registrations
SET term_id = 'dd062ecd-eddd-4ea3-a6d1-2ee3c0cb95f7',
    grading_slot_id = 'fdd526dd-3f40-4140-93bb-cfcc1f4ff5f3',
    ready_for_grading = true
WHERE id = 'c4039b0e-e5db-4d76-a42f-29551812c41d';