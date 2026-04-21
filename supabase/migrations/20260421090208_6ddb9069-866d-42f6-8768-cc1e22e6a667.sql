-- Backfill: Re-tag Daniel, Elliot, Earl John grading registrations from Term 2 to Term 1 2026 (Morley)
-- and link the correct grading_slot_id from the April 11 invoices.

UPDATE public.grading_registrations
SET term_id = 'dd062ecd-eddd-4ea3-a6d1-2ee3c0cb95f7',
    grading_slot_id = 'bcc577d6-2eda-4cd4-b67d-51746d722482',
    ready_for_grading = true
WHERE id = 'cf1f195a-acf1-418b-be8e-472e47a163c1'; -- Elliot

UPDATE public.grading_registrations
SET term_id = 'dd062ecd-eddd-4ea3-a6d1-2ee3c0cb95f7',
    grading_slot_id = 'bcc577d6-2eda-4cd4-b67d-51746d722482',
    ready_for_grading = true
WHERE id = 'c5575faf-c47c-461a-8df4-a21523a3e650'; -- Earl John

UPDATE public.grading_registrations
SET term_id = 'dd062ecd-eddd-4ea3-a6d1-2ee3c0cb95f7',
    grading_slot_id = '5d8aa9b1-8230-480d-8763-21e1aa7c94f5',
    ready_for_grading = true
WHERE id = '5d7c33ac-5cda-48a4-ac52-f75a42e2a296'; -- Daniel