## Goal

Add a **Compulsory** checkbox to the coaching line and each additional line in the Competition Events settings dialog. Items marked compulsory are **pre-checked and locked** (cannot be unchecked) on the public registration form, and are always billed on the generated invoice.

## 1. Schema (migration)

`competition_events`:
- Add `coaching_required boolean NOT NULL DEFAULT true` (coaching defaults to compulsory).
- `extra_lines` jsonb items gain a `required` boolean (default `false`). No schema change needed — it's a free-form jsonb field; the UI/RPC will read/write the new key.

Update `admin_upsert_competition_event` RPC to accept `p_coaching_required boolean` and persist it, and to persist `required` inside each `extra_lines` entry (passthrough — already jsonb).

Backfill: set `coaching_required = true` for the existing "2026 Singapore Open" row (matches its current behaviour where coaching was always added).

## 2. Admin UI — `CompetitionEventsSettingsDialog.tsx`

- Extend the form state with `coaching_required: boolean` and add `required: boolean` to each `CompetitionExtraLine`.
- **Coaching line card**: add a Checkbox labelled "Compulsory (auto-added, customer cannot opt out)" under the name/amount row.
- **Additional lines card**: for each row, add a small "Compulsory" checkbox next to the trash button (or below the inputs on mobile).
- Pass these through `adminUpsertCompetitionEvent`.
- Read them back in `startEdit`.

## 3. Service layer — `competitionPaymentSubmissionService.ts`

- `CompetitionExtraLine` interface: add `required?: boolean`.
- `CompetitionEvent` interface: add `coaching_required: boolean`.
- `adminUpsertCompetitionEvent` payload: add `coaching_required`; forward `required` flag on each extra line.

## 4. Public form — `PublicCompetitionPayment.tsx`

When rendering the coaching and extra-line checkboxes for the selected event:
- If `coaching_required === true`: render the coaching checkbox **checked and disabled**, with a small "Required" badge. Selection state is forced to true in the submission payload.
- For each extra line with `required === true`: same treatment — checked, disabled, "Required" badge, always included in the submission.
- Non-required extras remain togglable as today.

The submission snapshot already lists chosen lines, so the invoice generation in `admin_import_competition_submission` does not need changes — required lines are simply always present.

## Technical notes

- No changes to invoice generation, public list RPC, or other tabs.
- `extra_lines` jsonb is already round-tripped; adding the `required` key is non-breaking for existing rows (missing key = `false`).
- Default for `coaching_required` is `true` so existing events keep current behaviour (coaching was effectively mandatory before).
