## Goal

Make seminars work like competitions: multiple seminar events, an "Events" settings button, and event/branch filters on the `/grading-list` Seminars tab. The public `/seminars` booking page reads events and their packages from the database instead of the hard-coded June 2026 options.

## Current state (verified)

- `seminar_payment_submissions` has no `event_id`; the package is stored as free text (`package_code`, `package_label`, `session_dates[]`, `amount`).
- Seminar packages are hard-coded in `src/services/seminarPaymentSubmissionService.ts` as `SEMINAR_OPTIONS` (13 Jun / 20 Jun / combo, Bukit Merah).
- `SeminarsTab.tsx` has only a status filter; branch filter is passed in from the page. No event concept, no settings button.
- Competitions already have `competition_events` (name, is_active, display_order, indemnity clause/template, require_passport / require_photo / require_grading_card, coaching item, extra_lines jsonb) plus `CompetitionEventsSettingsDialog.tsx` and an event filter in `CompetitionsTab` inside `PublicGradingList.tsx`.

## Plan

### 1. Database

New table `seminar_events`, mirroring `competition_events` but with a `packages` jsonb list instead of coaching/extra lines:

- `name`, `is_active`, `display_order`
- `packages` jsonb: array of `{ code, label, amount, session_dates[] }`
- `indemnity_clause`, `indemnity_template_url`, `indemnity_template_name`
- `require_passport`, `require_photo`, `require_grading_card`
- `created_at`, `updated_at` with update trigger
- Grants: `select` to `anon` and `authenticated` (public booking page reads it), full to `service_role`; RLS with public read of active events and admin write via the existing security-definer pattern used by competitions.

Add `event_id uuid references seminar_events(id)` to `seminar_payment_submissions` (nullable).

Backfill: create the event "Unarmed Combat Seminar (Jun 2026)" carrying the three existing packages, and set `event_id` on all existing submission rows to it.

Security-definer RPCs mirroring the competition ones (the grading list runs anonymously, so direct table writes are blocked by RLS):

- `get_public_seminar_events()`
- `admin_upsert_seminar_event(...)`, `admin_delete_seminar_event(p_id)`, `admin_set_seminar_event_active(p_id, p_active)`

Update `submit_seminar_payment` to accept and store `event_id`, and `get_public_seminar_list` to accept `p_event_id` and return `event_id` / `event_name`.

### 2. Service layer — `src/services/seminarPaymentSubmissionService.ts`

- Add `SeminarEvent` / `SeminarPackage` types and CRUD helpers wrapping the new RPCs.
- Add `uploadSeminarIndemnityTemplate` (same bucket/pattern as the competition template upload).
- Extend `getPublicSeminarList(branchId, status, eventId)` and the row type with `event_id` / `event_name`.
- `SubmitSeminarPaymentInput` gains `event_id`; keep `SEMINAR_OPTIONS` only as a fallback until the backfill event exists, then remove it.

### 3. Settings dialog — new `src/components/grading-list/SeminarEventsSettingsDialog.tsx`

Copy of `CompetitionEventsSettingsDialog` structure: left column lists events with active toggle, edit and delete; right column is the form with

- name, active switch, display order
- packages editor (add/remove rows: label, amount, session dates — dates entered as a repeatable date list, displayed DD/MM/YYYY)
- indemnity clause textarea + template upload/download/remove
- requirement checkboxes: passport, photo, grading card

### 4. Seminars tab — `src/components/grading-list/SeminarsTab.tsx`

- Add an event `Select` (defaults to the newest active event, plus an "All events" option), keeping the existing status filter and the branch filter passed from the page.
- Add an "Events" settings button (same gating as competitions — visible with the admin password unlock flag already used on the page) that opens the new dialog.
- Add an "Event" column to the table; query key and fetch include `eventFilter`.

### 5. Public page — `src/pages/public/PublicSeminarPayment.tsx`

- Fetch active seminar events; if more than one, show an event picker, otherwise auto-select the single active event.
- Package radio/select is built from the selected event's `packages`; amount and session dates come from the chosen package.
- Honour the event's requirement toggles (passport / photo / grading card uploads) and render the indemnity clause + signature and template download when present, matching `/comps`.
- Submit with `event_id`.

## Technical notes

- All writes from `/grading-list` go through security-definer RPCs — that page is anonymous, so direct `update`/`insert` on the tables silently fails under RLS (same issue previously hit with grading cards).
- Dates render through `@/utils/dateFormat` helpers (DD/MM/YYYY); no native date inputs.
- Uploads reuse the `payment-proofs` bucket paths already used by seminars/competitions.
- Existing submissions keep working: `event_id` is nullable and the list still returns rows under "All events" even if unlinked.
