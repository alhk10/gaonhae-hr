# Grading events settings button on /access

Add a settings ("Events") button to the Grading tab of `/access`, mirroring the Events button on the Seminars/Competitions tabs, so grading events (grading slots) can be added, edited and removed from that page.

## What the user sees

- A "Events" button with a gear icon sits next to the Grading tab filters (date / branch), same placement and styling as the Seminars tab.
- Clicking it opens a dialog with two panels, like the Seminar Events dialog:
  - Left: list of existing grading events (date, time, branch, title, capacity), newest first, with edit, duplicate and delete icons. Active/cancelled shown as a toggle.
  - Right: form to create or edit an event — branch, date, start time, end time, title, location, examiner, capacity, min/max age, eligible belt levels, grading products, and which branches the event is available to.
- Duplicate loads the event into the form as a new entry (date cleared) so it can be edited before saving.
- Deleting an event that already has registrations is blocked with a clear message showing how many registrations exist; deleting an empty event asks for confirmation.
- The dialog is only available at the same unlock level as other admin actions on the page.

## Technical detail

- Grading events are rows in `public.grading_slots`. `/access` is a public, password-gated page with no Supabase session, so all writes must go through `SECURITY DEFINER` RPCs like the competition/seminar equivalents — the existing `createGradingSlot` / `updateGradingSlot` / `deleteGradingSlot` in `src/services/gradingService.ts` write to the table directly and are blocked by RLS here.
- New migration adding:
  - `admin_list_grading_slots()` — returns all slots with a `registration_count`.
  - `admin_upsert_grading_slot(...)` — insert when `p_id` is null, otherwise update; covers branch_id, grading_date, start_time, end_time, title, location, examiner_name, belt_levels, grading_product_ids, max_capacity, min_age, max_age, available_branch_ids, status.
  - `admin_delete_grading_slot(p_id)` — raises if any `grading_registrations` reference the slot, otherwise deletes.
  - All `SECURITY DEFINER`, `SET search_path = public`, executable by `anon` and `authenticated` (consistent with the other `/access` admin RPCs).
- New `src/components/grading-list/GradingEventsSettingsDialog.tsx`, modelled on `SeminarEventsSettingsDialog.tsx` (same two-panel layout, toast handling, react-query invalidation).
- Service wrappers added to `src/services/gradingPaymentSubmissionService.ts` alongside the other public/admin grading RPC helpers.
- `src/pages/public/PublicGradingList.tsx`: add the Events button into the Grading tab filter card and render the dialog; invalidate the grading list and grading-dates queries on save/delete so the date filter picks up new events.
