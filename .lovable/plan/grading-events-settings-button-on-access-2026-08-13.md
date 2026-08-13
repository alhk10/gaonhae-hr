# Grading events settings button on /access

Add a settings ("Events") button to the Grading tab of `/access`, mirroring the Events button on the Seminars/Competitions tabs, so grading events (grading slots) can be added, edited and removed from that page.

## What the user sees

- An "Events" button with a gear icon sits next to the Grading tab filters (date / branch), same placement and styling as the Seminars tab.
- Clicking it opens a dialog with two panels, like the Seminar Events dialog:
  - Left: list of existing grading events (date, time, branch, title), newest first, with edit, duplicate and delete icons.
  - Right: form to add or edit an event with these fields only:
    - Branch (host branch) and date
    - Start time, end time, title, location
    - Available to branches — multi-select, single or many; empty means all branches
    - Belt levels — multi-select, single or many
    - Minimum age and maximum age (optional)
    - Grading products — multi-select; selecting products auto-fills the belt levels (still editable)
  - Examiner and capacity fields are not shown.
- Duplicate loads the event into the form as a new entry (date cleared) so it can be edited before saving.
- Deleting an event that already has registrations is blocked with a clear message showing how many registrations exist; deleting an empty event asks for confirmation.
- Saving refreshes the grading list and the date filter so new events appear immediately.

## Technical detail

- Grading events are rows in `public.grading_slots` (columns already exist: `belt_levels`, `min_age`, `max_age`, `available_branch_ids`, `grading_product_ids`). No schema change needed; `examiner_name` and `max_capacity` are simply left at their defaults and not exposed.
- `/access` is a public, password-gated page with no Supabase session, so all writes must go through `SECURITY DEFINER` RPCs like the competition/seminar equivalents — the existing `createGradingSlot` / `updateGradingSlot` / `deleteGradingSlot` in `src/services/gradingService.ts` write to the table directly and are blocked by RLS here.
- New migration adding:
  - `admin_list_grading_slots()` — all slots with branch name and a `registration_count`.
  - `admin_upsert_grading_slot(...)` — insert when `p_id` is null, otherwise update; covers branch_id, grading_date, start_time, end_time, title, location, belt_levels, grading_product_ids, min_age, max_age, available_branch_ids.
  - `admin_delete_grading_slot(p_id)` — raises if any `grading_registrations` (or submissions) reference the slot, otherwise deletes.
  - All `SECURITY DEFINER`, `SET search_path = public`, executable by `anon` and `authenticated` (consistent with the other `/access` admin RPCs).
- New `src/components/grading-list/GradingEventsSettingsDialog.tsx`, modelled on `SeminarEventsSettingsDialog.tsx`, reusing `deriveBeltLevels` from `src/utils/gradingProductBelts.ts` for the product → belt auto-fill and the branch/product multi-select popovers used in `BulkAddGradingSlotsDialog.tsx`.
- Service wrappers added to `src/services/gradingPaymentSubmissionService.ts` alongside the other admin grading RPC helpers.
- `src/pages/public/PublicGradingList.tsx`: add the Events button into the Grading tab filter card, render the dialog, and invalidate the grading list and grading-dates queries on save/delete.

