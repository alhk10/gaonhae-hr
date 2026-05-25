## Problem

The Grading Certificate PDF prints the belt stored on the `grading_registrations.current_belt` snapshot, taken at registration time. When an admin later corrects the student's belt on the student record (e.g. RHUN: Yellow Tip → White), the registration row still holds the old value, so the certificate keeps printing "Yellow Tip Belt".

## Fix

Make the certificate prefer the student's **live** `current_belt` (from `students`) whenever the grading row is linked to a known student, falling back to the registration snapshot only when no student link exists (e.g. unmatched public payment submissions).

### Changes

1. **DB — `get_public_grading_list` RPC** (`supabase/migrations/...`)
   - Add a new column `student_current_belt text` to the returned table.
   - In the `registration` branch: select `s.current_belt`.
   - In the `submission` branch: `LEFT JOIN students s ON s.id = gps.matched_student_id` and select `s.current_belt` (null when unmatched).

2. **Frontend types** (`src/services/gradingPaymentSubmissionService.ts`)
   - Add `student_current_belt: string | null` to `PublicGradingListRow`.

3. **Certificate generation** (`src/pages/public/PublicGradingList.tsx`)
   - In `rowToCertInput` and `certFilename`, resolve the belt as:
     `beltOverride ?? r.student_current_belt ?? r.current_belt`.
   - No change to `BranchGradingList.tsx` / `GradingListTab.tsx` — those already source from the student record via their own props; verify and only adjust if they also read a stale snapshot.

4. **Row display** stays unchanged (still shows the registration snapshot in the table) so existing data isn't visually altered — only the generated certificate output changes.

### Out of scope

- No backfill / mutation of historical `grading_registrations.current_belt` values.
- No new UI to inline-edit the snapshot.
