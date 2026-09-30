# Edit button on pending student approvals

Add an **Edit** button to each card in the "New students waiting" and "Detail changes waiting" dialogs on the /access Summary tab, so staff can fix typos (names, email, contact numbers, DOB, etc.) before approving — instead of rejecting and asking the parent to re-submit.

## What changes

1. **Edit button on each pending card** (`src/components/grading-list/PendingApprovalsSection.tsx`)
   - A small outline "Edit" button next to Approve / Reject, enabled only when the /access password is entered (same `canApprove` gate).
   - Opens an edit dialog showing the same fields the card displays (first name, last name, DOB, gender, email, contact, WhatsApp, belt, emergency contact, medical, heard-from), pre-filled with the submitted values.
   - For **new students**: editing changes the details that will be saved when approved.
   - For **detail changes**: editing changes the proposed new values that will be applied when approved.
   - Save updates the pending row and refreshes the list; the card stays pending until Approve/Reject.

2. **Database** (one migration)
   - New SECURITY DEFINER RPC `update_public_pending_approval(p_kind text, p_id uuid, p_details jsonb)` that updates the pending registration / update-request row's details, only while its status is still pending. No change to the approve/reject RPCs — they already apply whatever details are stored at approval time.

3. **Service** (`src/services/publicStudentApprovalService.ts`)
   - New `updatePendingApprovalDetails(row, details)` calling the RPC.

## Notes

- Only pending rows can be edited; approved/rejected rows are untouched.
- No changes to the public registration form, /hello, or the student portal.
- Verification: typecheck + build, then a Playwright run on /access Summary editing a pending card and confirming the new values show on the card.
