# Delete with approval, and stop duplicate submissions

## 1. Delete button on every /access list

A small bin icon appears on each row of School fees, Grading, Competitions, Seminars, and Uniforms & guards (the same place it already sits today on some of the tabs), visible once the list is unlocked with the full password.

What happens when it is pressed:

- The confirmation panel keeps showing what will go with the record (invoice number, line items, payments), so nothing is deleted blind.
- A signed-in superadmin deletes immediately, as now.
- Everyone else sends a delete request. The row stays in place with a grey "Delete requested" badge and the bin icon turns into a disabled "Pending approval" marker so the same row cannot be requested twice.

## 2. Superadmin approval

A new "Transaction delete requests" card on the superadmin dashboard, matching the existing approval cards. Each entry shows the source (school fees / grading / competition / seminar / uniforms & guards), student name, amount, reference number, linked invoice, who asked, when, and the reason.

- Approve runs the same deletion the superadmin would have run by hand, including the linked invoice, payments, enrolment and grading records.
- Reject leaves the record untouched and clears the badge.
- The pending count feeds the dashboard's approvals total, like the other request types.

## 3. Duplicate submissions

Checked against live records: grading has 46 rows that look like repeats — for example the same student, same $49.05, same uploaded proof, submitted in the same second, three times, each one producing its own invoice. Competitions, seminars, uniforms & guards and school fees currently show none.

Three layers:

**Block on the form.** Before a public form saves, it checks for a matching submission from the last 24 hours (same person, branch, item and amount). If one exists, the submission is refused with a clear message giving the original reference number, so the parent knows their payment is already recorded. A one-off submission token also stops a double tap or a page refresh creating a second copy, which is what the identical-second triplicates look like.

**Flag on the lists.** Rows that look like a repeat of another row get an amber "Possible duplicate" badge with a tooltip naming the other reference number, so staff can check and use the delete button. Nothing is removed automatically.

**Nothing removed retroactively.** The 46 historical rows stay in place, flagged, for staff to judge.

## Technical notes

- New table `submission_deletion_requests` (source, record id, student name, reference, amount, invoice id, reason, requested_by, status, timestamps) with grants, RLS, and a `SECURITY DEFINER` RPC `submit_submission_deletion_request(...)` callable from the public /access pages. Approval RPC `approve_submission_deletion_request(uuid)` dispatches to the existing `admin_delete_grading_submission` / `admin_delete_grading_registration` / `admin_delete_competition_submission` / `admin_delete_seminar_submission` / `admin_delete_school_fees_submission` / `admin_delete_guards_purchase` functions; reject just updates status.
- Extend the five public list RPCs with `delete_request_status` so rows can show the pending badge, and with a `duplicate_of_reference` computed flag (same email/name/amount/branch within 24h of an earlier row).
- Frontend: shared `RequestDeleteButton` + confirmation reused by `PublicGradingList.tsx` (grading and competition), `SchoolFeesTab.tsx`, `SeminarsTab.tsx`, `PublicGuardsPurchaseList.tsx`; new `SubmissionDeleteApprovals.tsx` wired into `SuperadminDashboard.tsx` with a `submissionDeletionRequestService.ts`.
- Duplicate blocking inside the existing submit RPCs (`submit_grading_payment`, `submit_competition_payment`, `submit_seminar_payment`, guards and school-fee chat submission) so it holds regardless of the client; add `client_ref` to the grading, guards and chat submission tables with a unique index (competitions and seminars already have it).
