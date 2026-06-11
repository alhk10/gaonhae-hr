## Goal

On `/grading-list` → **Competitions** tab, add an event filter so the long submission list can be scoped to one competition event. Default to the "current" event. Back-fill all 15 existing competition submissions (which currently have `event_id = NULL`) to a newly-created event called **2026 Singapore Open**.

## 1. Data back-fill (data migration via insert tool)

- Insert one row into `competition_events`:
  - `name = '2026 Singapore Open'`
  - `is_active = true`
  - `display_order = 0`
  - `coaching_label = 'Coaching fee'`, `coaching_amount = 0`, `extra_lines = '[]'`
  - (other nullable fields left default)
- `UPDATE competition_payment_submissions SET event_id = <new event id> WHERE event_id IS NULL;` (touches all 15 existing rows so they appear under this event).

## 2. UI — event filter on Competitions tab

File: `src/pages/public/PublicGradingList.tsx` (`CompetitionsTab` component, ~line 1880).

- Add a `useQuery` that fetches `competition_events` (`id, name, is_active, created_at`) ordered so the "current" event is first and the remaining events follow by newest:
  - **Current** = the active event (`is_active = true`) with the most recent `created_at`. If no active event exists, fall back to the newest event overall.
  - Sort: current first, then remaining events by `created_at DESC`.
- Add `eventFilter` state, defaulting to the current event's id once events load (`'all'` if no events).
- Render a `Select` next to the existing "Events" settings button:
  - Options: each event by name, plus a final `All events` option.
- Filter the existing rows in `rows` by `r.event_id === eventFilter` (skip when `'all'`). `PublicCompetitionListRow` needs `event_id`; if not already present, add it to the row type and ensure `getPublicCompetitionList` / `get_public_competition_list` RPC returns it (verify; add to select if missing).
- Keep the existing student-name sort inside the chosen event.

No changes to invoice generation, schema, or other tabs.

## Technical notes

- Service / RPC: confirm `getPublicCompetitionList` returns `event_id`. If not, extend the RPC (migration) and the TS type. Most likely it already returns `event_name`; we'll add `event_id` alongside.
- Filter dropdown uses the same styling as the existing branch filter on this page for consistency.
- No edits to the Superadmin "Competition Registrations" approvals card.
