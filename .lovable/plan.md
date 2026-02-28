

## Plan: Casual Employee Branch Update with Superadmin Approval

### Overview
Allow casual employees to request a branch change from their dashboard. Requests go to superadmin for approval, following the same pattern as `student_update_requests` and `slot_booking_edit_requests`.

### Changes

#### 1. Create Supabase table: `employee_branch_requests`
- Migration with columns: `id`, `employee_id`, `current_branch`, `requested_branch`, `reason`, `status` (pending/approved/rejected), `requested_at`, `reviewed_by`, `reviewed_at`, `review_notes`, `created_at`
- RLS policies for authenticated users

#### 2. New service: `src/services/employeeBranchRequestService.ts`
- `createBranchRequest(employeeId, currentBranch, requestedBranch, reason)`
- `getPendingBranchRequests()` — for superadmin dashboard
- `getPendingBranchRequestsCount()`
- `approveBranchRequest(requestId, reviewedBy)` — updates the employee's `department` field on approval
- `rejectBranchRequest(requestId, reviewedBy, notes)`
- `getEmployeeBranchRequests(employeeId)` — for employee to see their request status

#### 3. Update `EmployeeDashboard.tsx` — Add branch change request UI for casual employees
- Show current branch with an "Update Branch" button (only for casual employees)
- Opens a dialog with branch selector and reason field
- Shows pending request status if one exists
- Submits via the new service

#### 4. New component: `src/components/dashboard/BranchChangeRequestDialog.tsx`
- Branch selector (from existing branches list)
- Reason text field
- Submit button that calls `createBranchRequest`

#### 5. Update `SuperadminDashboard.tsx` — Add branch change approvals section
- New approval section "Branch Change Requests" alongside existing ones
- Shows employee name, current branch, requested branch, reason
- Approve/Reject buttons following existing approval UI patterns

### Files to Create
- `src/services/employeeBranchRequestService.ts`
- `src/components/dashboard/BranchChangeRequestDialog.tsx`

### Files to Modify
- `src/components/dashboard/EmployeeDashboard.tsx` — Add branch change button + dialog for casual employees
- `src/components/dashboard/SuperadminDashboard.tsx` — Add branch change approval section

