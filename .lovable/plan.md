## Goal

1. Replace the free-text "Name" input on competition **Additional lines** with a dropdown sourced from an admin-managed preset list (e.g. Individual Poomsae, Individual Kyorugi, Mix Pair, Mix Team).
2. On the public competition form, when a participant selects an additional line flagged as "requires weight" (Individual Kyorugi by default), show a required numeric weight (kg) input, and store the value with the submission.

## Database

New table `public.competition_extra_line_presets`:
- `name` (text, unique, not null)
- `default_amount` (numeric, default 0)
- `requires_weight` (bool, default false)
- `display_order` (int, default 0)
- `is_active` (bool, default true)
- standard id/timestamps; GRANT select to anon, full to authenticated/service_role; RLS: public read of active rows, admin full access.

Seed rows: Individual Poomsae (110), Individual Kyorugi (110, requires_weight=true), Mix Pair (65), Mix Team (65).

RPCs:
- `get_public_competition_extra_line_presets()` — returns active presets (anon-callable).
- `admin_list_competition_extra_line_presets()` / `admin_upsert_competition_extra_line_preset()` / `admin_delete_competition_extra_line_preset()` — admin-only.

Schema change on `competition_payment_submissions`: extend stored `extra_lines` JSON shape to `{ label, amount, weight_kg? }` (no column change needed — already JSONB).

## Admin UI — `CompetitionEventsSettingsDialog.tsx`

- Load presets via `getCompetitionExtraLinePresets()` once when dialog opens.
- In the "Additional lines" editor, replace the free-text Name `<Input>` with a `SearchableCategorySelect` populated from presets, with an "Add new preset" action that opens a small inline dialog to create a preset (name + default amount + requires_weight + active). Selecting a preset auto-fills the amount field (still editable).
- Add a dedicated "Manage presets" button next to the "Add line" button to open a list/CRUD sub-dialog (rename, change default amount, toggle requires_weight, archive).
- Persisted shape on the event stays the same (`extra_lines: [{label, amount, required}]`), so the existing RPC is unchanged.

## Public form — `PublicCompetitionPayment.tsx`

- Fetch presets once via React Query and build a lookup `label → requires_weight`.
- Track weight per selected extra line in component state: `Record<number, string>` (index → kg string).
- Inside the extras checkbox list, when an extra's label maps to `requires_weight=true` AND it is selected, render an inline required numeric input "Weight (kg)" (step 0.1, min 10, max 200) directly under that row.
- Extend `canSubmit` so any required weight inputs must be filled with a valid positive number.
- In `handleSubmit`, attach `weight_kg` into the corresponding extra line object before calling `submitCompetitionPayment`.

## Service / types — `competitionPaymentSubmissionService.ts`

- Add `weight_kg?: number | null` to `CompetitionExtraLine`.
- Pass it through `submitCompetitionPayment` (already serializes the whole array into the RPC payload — no RPC change needed).
- Add helper functions for the new preset RPCs.

## Out of scope

- No changes to grading/seminar flows.
- Existing submitted records remain valid (weight is optional in stored shape).
