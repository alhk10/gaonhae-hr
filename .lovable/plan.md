## Investigation: Joel's missing entry in Term 1 grading list

**Findings from the database:**
- Student **JOEL WATKINS** (White → Yellow Tip) has invoice `INV-2026-00259` with a Grading line item, status `verified` (paid).
- A `grading_registrations` row already exists for him, correctly linked to **Term 1 2026** at the Morley branch with `ready_for_grading = true`. So data and backfill are fine.
- Root cause: Joel's student status is **`withdrawn`**, not `active`.
- Both `BranchGradingList.tsx` (line 272) and `GradingListTab.tsx` (line 256) filter the candidate students with `.ilike('status', 'active')`, which silently drops Joel even though he has a paid grading invoice and a valid registration.

This same filter would hide any withdrawn or inactive student who still has a valid, non-cancelled grading registration that hasn't been graded yet.

## Fix

Relax the student status filter in both grading list queries so that withdrawn / inactive students are still shown when they have a valid grading registration linked to the selected term and branch.

### Changes

1. **`src/components/dashboard/BranchGradingList.tsx`**
   - Remove `.ilike('status', 'active')` from the students query (around line 272).
   - Keep selecting `status` and pass it through so we can render a small "Withdrawn" / "Inactive" badge next to the student name for visual clarity.

2. **`src/components/sales/GradingListTab.tsx`**
   - Same change: remove the `.ilike('status', 'active')` filter (around line 256).
   - Surface the student status in the row (badge) so superadmins can see when a withdrawn student still has an outstanding grading registration.

3. **Eligibility scope unchanged**: We still gate inclusion by:
   - Non-cancelled invoice with a Grading category line item, OR
   - Existing `grading_registrations` row for the term.
   This means trial/active/withdrawn students all qualify only if their grading paperwork is real.

### Out of scope
- No DB migration needed — Joel's registration row is already correct.
- No changes to backfill / sync logic.

After this fix, Joel will appear in Morley's Term 1 grading list with his existing Verified/Paid status, and a small "Withdrawn" tag next to his name.

**Approve to switch to default mode and apply the changes.**