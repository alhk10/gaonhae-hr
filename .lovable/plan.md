

## Plan: Replace Employee Branch Update with Slot Booking Branch Change Requests

### What's Changing
The current implementation lets casual employees request changing their **employee department** (branch assignment). The actual need is for casual employees to request changing the **branch on their existing slot bookings**, with superadmin approval.

### Approach
Extend the existing `slot_booking_edit_requests` system (which already handles `cancel` and `swap`) to support a new `branch_change` request type. Remove the standalone `employee_branch_requests` feature entirely.

### Changes

#### 1. Database Migration
- Add `new_branch_id` and `new_branch_name` columns to `slot_booking_edit_requests` table (nullable, used only for `branch_change` type)
- Drop the `employee_branch_requests` table (clean up)

#### 2. Update `src/services/slotBookingEditRequestService.ts`
- Add `branch_change` to the `request_type` union
- Accept `newBranchId` and `newBranchName` in `createEditRequest`
- In `approveEditRequest`, handle `branch_change` type: update the booking's `branch_id` and `branch_name` via `slot_bookings_new`

#### 3. Update `src/components/dashboard/EmployeeDashboard.tsx`
- Remove the "Update Branch" button, `BranchChangeRequestDialog` import, and `pendingBranchRequest` query
- Add a "Change Branch" action on individual slot booking cards (or a dialog that lets the employee select a booking + new branch)
- Alternatively: add a "Change Booking Branch" quick action button that opens a dialog showing the employee's upcoming approved bookings, lets them select one and pick a new branch, then submits via `createEditRequest` with type `branch_change`

#### 4. New component: `src/components/dashboard/SlotBookingBranchChangeDialog.tsx`
- Lists the employee's upcoming approved/pending bookings (date + current branch)
- Employee selects a booking, picks a new branch, provides a reason
- Submits via `createEditRequest({ requestType: 'branch_change', bookingId, newBranchId, newBranchName, reason })`

#### 5. Update `src/components/dashboard/SlotBookingEditApprovals.tsx`
- Handle display of `branch_change` requests: show current branch → requested branch
- Approval triggers branch update on the slot booking

#### 6. Remove unused files
- Delete `src/components/dashboard/BranchChangeRequestDialog.tsx`
- Delete `src/components/dashboard/BranchChangeApprovals.tsx`
- Remove `BranchChangeApprovals` from `SuperadminDashboard.tsx`
- Delete `src/services/employeeBranchRequestService.ts`

### Files to Create
- `src/components/dashboard/SlotBookingBranchChangeDialog.tsx`

### Files to Modify
- `src/services/slotBookingEditRequestService.ts`
- `src/components/dashboard/EmployeeDashboard.tsx`
- `src/components/dashboard/SlotBookingEditApprovals.tsx`
- `src/components/dashboard/SuperadminDashboard.tsx`

### Files to Delete
- `src/components/dashboard/BranchChangeRequestDialog.tsx`
- `src/components/dashboard/BranchChangeApprovals.tsx`
- `src/services/employeeBranchRequestService.ts`

