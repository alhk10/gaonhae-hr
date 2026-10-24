# Fix: Zane Ho's grading entry can't be opened or verified

## What the data shows
- Zane (SHUOJUN ZANE HO) has **two** grading payments for the same grading slot, both $59.95, 1st Poom:
  - GP-202609-0159 (20/09/2026, Balmoral branch, as "ZANE HO") — **already verified**, invoice linked.
  - GP-202609-0153 (19/09/2026, Bukit Merah branch, as "SHUOJUN ZANE HO") — still **pending**. This is the one in the Summary list.
- So the pending entry is almost certainly a **duplicate payment** for a grading he has already paid for. The one-grading-per-student-per-term rule blocks it from being verified, which is why it looks stuck.
- The Summary row also shows "—" for the date, because the grading list doesn't send the submission date to the Summary.

## Plan
1. **Confirm the cause:** open the entry from Summary in the preview to see exactly what fails: the Open jump, the Grading tab filter, or the Verify error.
2. **Make Open land on the right row:** Summary "Open" for grading goes to the Grading tab, switches to the entry's branch and term, and highlights that entry, even when it was submitted under a different branch than the student's usual one.
3. **Explain duplicates clearly:** when an entry duplicates an already-verified grading for the same student and slot, show a "Duplicate of GP-202609-0159" badge. Verify then gives a plain message instead of failing with no explanation. Staff get these choices:
   - **Turn into credit:** convert the duplicate $59.95 into student credit.
   - **Reject as duplicate:** reject the entry.
   - **Verify anyway:** verify it with the existing staff override confirmation.
4. **Fix the missing date** in the Summary list so grading entries show their submitted date and sort oldest first.
5. **Resolve Zane's case:** once this is built, staff pick one of the actions above for GP-202609-0153. Nothing is changed automatically.

## Technical details
- Grading list RPC (`getPublicGradingList`) should return `created_at` and `reference_number` for submission rows; SummaryTab `rowDate` uses them.
- Summary `onDrill` passes the submission id; the Grading tab scrolls to it and highlights it, and clears any filters that would hide it.
- Duplicate detection: a submission with the same `matched_student_id` and `resolved_grading_slot_id` as an already-verified submission. Show this in the list and in the verify-error path of `admin_verify_grading_submission`.
- Credit conversion reuses the existing shared refund/credit flow. It never creates a new invoice.
