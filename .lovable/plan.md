

## Plan: Student Withdrawal with Superadmin Approval

### Overview
Add an inline "Withdraw" button in the branch dashboard student table that creates a withdrawal request requiring superadmin approval. Add a corresponding approval section in the Superadmin Dashboard that is hidden when empty.

### Database Changes

**New table: `student_withdrawal_requests`**
- `id` UUID primary key
- `student_id` UUID references students(id)
- `student_name` text
- `branch_id` text
- `requested_by` text (employee email)
- `requested_at` timestamptz default now()
- `status` text default 'pending' (pending/approved/rejected)
- `reviewed_by` text nullable
- `reviewed_at` timestamptz nullable
- `review_notes` text nullable
- `created_at` / `updated_at` timestamptz

RLS policies: superadmins full access, employees with branch access can insert and select.

### Service Layer

**New file: `src/services/studentWithdrawalRequestService.ts`**
- `createWithdrawalRequest(studentId, studentName, branchId, requestedBy)`
- `getPendingWithdrawalRequests()` — all pending (for superadmin dashboard)
- `getPendingWithdrawalRequestsCount()` 
- `approveWithdrawalRequest(requestId, reviewedBy)` — marks approved, updates student status to "withdrawn"
- `rejectWithdrawalRequest(requestId, reviewedBy, notes)`

### UI Changes

**1. Branch Dashboard student table (`BranchDashboard.tsx`)**
- Add an "Actions" column (visible when not in mass edit mode)
- Show a small "Withdraw" button (or icon button) inline per student row for active students
- On click: confirm via alert dialog, then call `createWithdrawalRequest`
- Toast success: "Withdrawal request submitted for superadmin approval"

**2. New component: `StudentWithdrawalApprovals.tsx`**
- Similar pattern to existing approval components (e.g., `StudentRegistrationApprovals`)
- Shows pending withdrawal requests with student name, branch, requested by, date
- Approve/Reject buttons
- On approve: updates student status to "withdrawn" and marks request approved
- Hidden when no pending requests (conditional render)

**3. Superadmin Dashboard (`SuperadminDashboard.tsx`)**
- Import and render `StudentWithdrawalApprovals` in the overview tab
- Conditionally hidden when count is 0 (following the existing pattern)

