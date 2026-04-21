

## Plan: Superadmin direct withdrawal with confirmation; others continue via approval

### Current behavior

In `src/components/dashboard/BranchDashboard.tsx` (lines 1164–1186), every user — including superadmin — clicks **Withdraw**, gets a native `confirm()`, and the action calls `createWithdrawalRequest(...)` which inserts a `pending` row in `student_withdrawal_requests`. Superadmin must then go to the Approvals tab and approve their own request to actually withdraw the student.

### Change

Branch on `user?.role === 'superadmin'`:

- **Superadmin** → an `AlertDialog` confirmation ("Withdraw STUDENT NAME? This will set their status to 'withdrawn' immediately."). On confirm, directly update `students.status = 'withdrawn'` (skip the request table entirely). Toast success and refresh the student list.
- **All other roles** → unchanged behaviour: `createWithdrawalRequest(...)` queues a pending request for superadmin approval (existing `withdrawal-approval-workflow` rule preserved).

### Implementation

#### 1. New service helper — `src/services/studentWithdrawalRequestService.ts`

Add `directWithdrawStudent(studentId: string)`:
- Updates `students` row: `status = 'withdrawn'`.
- Throws on error.
- Intended for superadmin-only callers (the gate is enforced client-side; RLS already permits superadmin updates).

#### 2. Replace native confirm with `AlertDialog` in `BranchDashboard.tsx`

- Add state near the existing dialog state:
  ```ts
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; name: string } | null>(null);
  ```
- The Withdraw button (lines 1164–1186) now just sets `withdrawTarget` (no `confirm()`, no inline async logic).
- Render one `<AlertDialog>` near the other dialogs (around line 1480) controlled by `withdrawTarget !== null`:
  - **Superadmin copy**: "Withdraw {name}? This will mark the student as withdrawn immediately. This action requires no further approval."
  - **Non-superadmin copy**: "Submit a withdrawal request for {name}? A superadmin must approve before the student is withdrawn."
  - Confirm button label: "Withdraw" (superadmin) / "Submit Request" (others), styled `bg-destructive`.
  - On confirm:
    - Superadmin → `await directWithdrawStudent(withdrawTarget.id)` → toast "STUDENT NAME withdrawn" → invalidate `branch-students` (and `pending-withdrawal-requests` for safety).
    - Non-superadmin → existing `createWithdrawalRequest(...)` call → toast "Withdrawal request submitted for superadmin approval".
  - Close dialog by setting `withdrawTarget = null`.

#### 3. No other surface changes

- `StudentWithdrawalApprovals.tsx` (Approvals tab) is untouched — it keeps handling pending requests from non-superadmin users.
- `getPendingWithdrawalRequestsCount` badge unaffected — superadmin direct-withdrawals never create a request row.
- The "A withdrawal request is already pending" toast in the screenshot only triggers on the request path; superadmin direct flow bypasses it (intentional — superadmin is the authority and can withdraw immediately even if a stale pending request exists; they can separately reject the pending request from the Approvals tab if desired).
- Mass Edit mode → Actions cell still hidden (no regression).
- Withdrawn students remain filtered out of the list (no regression).

### Behavioural rules preserved

- Memory `withdrawal-approval-workflow`: still enforced for non-superadmin.
- Memory `student-status-constraints`: only writes `'withdrawn'` (allowed value).
- Branch context unchanged; no RLS / migration work.

### Verification

1. As **superadmin** on Morley → Students → click **Withdraw** on ARIANA ZHENG → AlertDialog appears with superadmin copy → click **Withdraw** → ARIANA disappears from the list immediately; no entry added to Approvals tab.
2. As **non-superadmin staff** on Morley → click **Withdraw** on any student → AlertDialog appears with request copy → click **Submit Request** → toast "submitted for superadmin approval" → student remains in the list; row appears in Superadmin Approvals tab.
3. Cancel button on either variant closes the dialog with no state change.
4. Mass Edit mode → Actions column hidden as today.
5. Withdrawn students still excluded from the list.

### Files affected

- `src/services/studentWithdrawalRequestService.ts` — add `directWithdrawStudent`.
- `src/components/dashboard/BranchDashboard.tsx` — replace native confirm with role-aware `AlertDialog`; route superadmin to direct update, others to existing request flow.

### Out of scope

- Bulk withdrawal from Mass Edit selection.
- A "Reactivate withdrawn student" flow.
- Changes to the Approvals tab UI or to the existing approve/reject service functions.

