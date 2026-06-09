# Competition tab: add Competition/Reporting datetime + Court columns

File: `src/pages/public/PublicGradingList.tsx` (Singapore Open Poomsae table) plus the competition submission service + a new migration.

## Database

Add 3 nullable columns to `competition_payment_submissions`:
- `competition_at` (timestamptz) — event date & time
- `reporting_at` (timestamptz) — reporting date & time
- `court` (text) — short court label

Stored per submission so each entry can be set independently. Migration adds columns only; no RLS / grant changes.

## Service

`src/services/competitionPaymentSubmissionService.ts`
- Extend `PublicCompetitionListRow` with `competition_at`, `reporting_at`, `court`.
- Include the 3 fields in the `select(...)` used by `getPublicCompetitionList`.
- Add `updateCompetitionSchedule(id, { competition_at, reporting_at, court })` that updates the row and returns void.

## UI (Singapore Open Poomsae table)

Insert three new columns **before Branch** (so the new left-to-right order is):
Competition · Reporting · Court · Branch · Student · Belt · Categories · Status · Amount · Poomsae 1 · Poomsae 2 · Cert · Proof · Actions · (delete)

Editing pattern (inline, no extra dialog):
- **Competition / Reporting** — render as a single `<Input type="datetime-local">` per cell (compact `h-7 text-[11px] w-[150px]`). On `onBlur` (and only if the value changed), call `updateCompetitionSchedule` via a `useMutation`, then `queryClient.invalidateQueries(['public-competition-list'])`. Display is `formatDate(...) + ' ' + HH:mm` when not focused — use a small helper that converts ISO ↔ datetime-local string. (Native date input is acceptable here because this is a staff editor, not a user-facing date display; the read-only badge / placeholder above the input still uses `formatDate` from `@/utils/dateFormat` for the DD/MM/YYYY label.)
- **Court** — `<Input>` with `h-7 text-[11px] w-[70px]`, same onBlur-save pattern.

All three inputs are always visible (no "edit mode" toggle). Empty values render as a placeholder input.

Sort order (already A→Z by student name) is unchanged.

## Out of scope
No change to public payment flow, email templates, or other tabs.
