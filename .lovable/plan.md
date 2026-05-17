# Grading List redesign

Convert the per-slot card list at `/grading-list` into a numbered table per slot, headed by the slot's title and sorted by branch then student (no branch grouping).

## Changes

### 1. Backend — expose slot title

Migration on `get_public_grading_list`:
- Add `slot_title text` column to the RETURNS TABLE (selected from `grading_slots.title`).
- Selected in both the registration and submission UNION branches.
- No logic change otherwise.

### 2. Service type

`src/services/gradingPaymentSubmissionService.ts`:
- Add `slot_title: string | null` to `PublicGradingListRow`.

### 3. UI — `src/pages/public/PublicGradingList.tsx`

Replace the existing per-slot `Card` rendering with a table per slot:

- **Grouping key** unchanged: `grading_date | start_time | slot_id` (so each grading slot remains one group, but no branch grouping).
- **Header per group**: slot title (fallback to `formatDate(date) HH:MM` when title is missing). Date + time stay as a subdued line beside/under the title.
- **Sort within group**: by `branch_name` asc, then `student_name` asc. No visual branch grouping — branch is just the first data column.
- **Table** (shadcn `Table`):
  - Columns: `#` (1-based row number), `Branch`, `Student`, `Belt` (current → target), `Status` badge.
  - In edit mode, append: `Amount`, `Proof`, `Edit`, `Delete` (only meaningful for `source === 'submission'` rows; cells render `—` for registration rows).
  - Alternating row shading via `odd:bg-muted/40` on `TableRow`.
  - Compact: `text-xs`, `py-1.5` cells.
- Keep the top date filter, unlock/edit-mode flow, slot-edit dialog, and delete-confirm dialog unchanged.
- Widen container from `max-w-3xl` to `max-w-5xl` to fit the table comfortably.

## Out of scope

- No change to data sources, eligibility logic, or admin password flow.
- No change to `PublicGradingPayment` page.
