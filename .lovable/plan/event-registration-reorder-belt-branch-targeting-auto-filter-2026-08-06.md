# Event Registration: reorder, belt/branch targeting, auto-filtered events

## What changes

**Public page (/seminars)**
- Page title becomes "Event Registration"; all remaining "Seminar" wording in labels and helper text becomes "Event" (field label "Event *", "Select event", "No open events", "Event Package(s)").
- The event dropdown moves from the top of the form to directly **after the Current Belt field**. Personal details (name, email, branch, DOB, gender, belt) are shown first and no longer gated behind picking an event; the package list, document requirements, indemnity and payment sections stay gated behind an event being chosen.
- The amber "Select first" highlight stays on the event field, now in its new position.

**Admin settings dialog (/access > Seminars > Events)**
- Each event gains two optional targeting filters in the edit form:
  - **Branches** — multi-select checkbox list of branches. Empty = all branches.
  - **Belts** — multi-select checkbox list of belt levels (SG + AU combined). Empty = all belts.
- Existing events keep working unchanged (empty = no restriction).

**Automatic event filtering**
- On the public page, the event dropdown only lists active events whose branch filter includes the selected branch and whose belt filter includes the selected belt.
- If the current selection stops matching after the user changes branch or belt, the selection clears (and packages reset) and the user is prompted to pick again.
- When exactly one event matches, it is preselected.
- If no event matches, a short message explains no events are open for that branch/belt combination.

## Technical detail

- Migration: add `branch_ids text[] default '{}'` and `belts text[] default '{}'` to `public.seminar_events`; update `get_public_seminar_events` and `admin_upsert_seminar_event` to return/accept both columns (new params appended with defaults so existing callers keep working).
- `src/services/seminarPaymentSubmissionService.ts`: add `branch_ids: string[]` and `belts: string[]` to `SeminarEvent` and to the `adminUpsertSeminarEvent` input, normalising to arrays on read.
- `src/components/grading-list/SeminarEventsSettingsDialog.tsx`: add the two checkbox groups to the form (branches from `getPublicBranches`, belts from `SG_BELT_LEVELS` + `AU_BELT_LEVELS` de-duplicated), include them in create/edit/duplicate state and in the upsert payload.
- `src/pages/public/PublicSeminarPayment.tsx`: derive `events` with a branch/belt match filter, move the event block below the Current Belt block, ungate personal-detail fields, and rename user-facing strings.
