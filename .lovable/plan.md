## Split `student_name` into First Name + Last Name (UI + DB)

### Database (`grading_payment_submissions`)

1. **Migration** — add columns and backfill:
   - `ALTER TABLE public.grading_payment_submissions ADD COLUMN first_name text, ADD COLUMN last_name text;`
   - Backfill: set `first_name = upper(split_part(student_name,' ',1))`, `last_name = upper(NULLIF(substring(student_name from position(' ' in student_name)+1), ''))` for existing rows.
   - Make `first_name NOT NULL`; `last_name NOT NULL` (defaults to empty string for any remaining nulls before constraint).
   - Drop `student_name` column.

2. **Update RPCs** that currently SELECT/return `student_name` from this table (keep the returned field name `student_name` so consumers don't break):
   - `get_grading_list_combined` (migration 20260517062227 / 20260517174940) — replace `upper(gps.student_name)` with `upper(coalesce(gps.first_name,'') || ' ' || coalesce(gps.last_name,''))` aliased as `student_name`.
   - Any other function in `supabase/migrations` referencing `gps.student_name` (search: `grading_payment_submissions` + `student_name`) — same replacement.

### Backend service (`src/services/gradingPaymentSubmissionService.ts`)

3. Update `CreateGradingPaymentSubmissionInput` and the insert call to use `first_name` + `last_name` instead of `student_name`.
4. `safeName` for the storage path: derive from `${first_name}_${last_name}`.
5. `PublicGradingSubmission` interface: keep exposing `student_name` (concatenated) for compatibility with `PublicGradingList`, or expose both — recommend expose both `first_name`, `last_name`, and derived `student_name` getter.

### UI (`src/pages/public/PublicGradingPayment.tsx`)

6. Replace `studentName` state with `firstName` + `lastName`.
7. Replace the single "Student Name *" input with two side-by-side fields ("First Name *", "Last Name *") in a 2-col grid (stacks on mobile). Auto-uppercase on input.
8. `canSubmit` requires both trimmed.
9. Submit passes `first_name` and `last_name` (uppercased) to the service.
10. Email confirmation `studentName` prop becomes `${firstName} ${lastName}`.

### Consumers to verify (no expected changes)

- `PublicGradingList.tsx` — continues to read `student_name` from RPC payload (now computed).
- `check-grading-reminders` edge function — reads from `students` table (uses `student.name`), unaffected.
- Other `student_name` usages elsewhere in the codebase refer to the `students` table (which already has `first_name`/`last_name`), not the submissions table — no change needed.

### Notes

- All names stored uppercase per project convention.
- This is a destructive column drop; the backfill must run in the same migration before the drop.