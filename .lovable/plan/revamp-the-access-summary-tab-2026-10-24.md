# Revamp the /access Summary tab

New layout, top to bottom. Branch-locked staff still see only their own branch.

## 1. Student snapshot (top)
Four tiles: **Current students**, **Paid**, **Unpaid**, **No invoice**, each with a branch breakdown underneath (all-branch staff only).
- Current students = status active or trial (not withdrawn/inactive).
- Based on each student's invoice for the current term (latest term if none is running):
  - Paid = paid, awaiting verification, or paid & verified
  - Unpaid = draft, unpaid/sent/overdue, or partially paid
  - No invoice = no term invoice at all
- Clicking a tile opens the Students tab with that payment filter applied.

## 2. Approvals & verifications (one list, oldest first)
Replaces the "Student approvals by branch" and "Pending approvals by branch" tables with a single list mixing:
- new student registrations and detail-change requests
- pending payment verifications: school fees, grading, competitions, seminars, guards
- invoice requests (edit, delete, refund, credit) for superadmin

Each row: submitted date/time (DD/MM/YYYY), type badge, student name, branch, amount, and an Open button that jumps to the right tab or opens the existing approve dialog. Filter chips by type; count badge in the header.

## 3. Uncollected guards (list, oldest first)
Replaces the by-branch table. Each row: order date, student, branch, items, amount, Open button. Total count and amount in the header.

## 4. Student count by month
Keep the existing month table with year picker, moved to the bottom, plus a small line chart of the total.

## Technical details
- New SECURITY DEFINER RPC `get_access_student_payment_summary(p_branch_id uuid)` returning per-branch counts (current/paid/unpaid/no_invoice), so counts aren't capped by the 200-row directory list; grants to anon/authenticated.
- Approvals list built client-side in `SummaryTab.tsx` by merging the already-loaded submission queries plus `PendingApprovalsSection` sources into one `{type, created_at, ...}` array sorted ascending; `PendingApprovalsSection` refactored to expose its rows rather than render separate cards.
- Guards list from `listGuardsPurchases` filtered `!collected` and not rejected/cancelled, sorted by `created_at` ascending.
- StudentsTab accepts an initial payment filter for tile drill-through.
