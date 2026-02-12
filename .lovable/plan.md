
# Add "Casual Employee Schedule" Tab to Branch Dashboard

## Overview
Add a new tab to the Branch Dashboard that displays a calendar view of approved casual employee slot bookings for the selected branch. Editing (cancelling or swapping employees) will require superadmin approval rather than being performed directly.

## Changes

### 1. New Component: `BranchCasualSchedule.tsx`
Create `src/components/dashboard/BranchCasualSchedule.tsx` that:
- Fetches approved slot bookings from `slot_bookings_new` filtered by `branch_id` and `status = 'approved'`
- Displays a monthly calendar view (reusing the same Calendar component pattern from `SlotBookingManagementContent`)
- Each day cell shows employee names with color-coded booking cards
- Clicking a booking opens a detail view (read-only by default)
- Includes a "Request Change" action (cancel/swap) that creates a pending approval request instead of performing the action directly

### 2. New Database Table: `slot_booking_edit_requests`
Store edit requests that require superadmin approval:
- `id` (uuid, PK)
- `booking_id` (text, references the slot booking)
- `request_type` (text: 'cancel' or 'swap')
- `requested_by` (text, employee ID)
- `new_employee_id` (text, nullable - for swaps)
- `new_employee_name` (text, nullable - for swaps)
- `reason` (text)
- `status` (text: 'pending', 'approved', 'rejected')
- `reviewed_by` (text, nullable)
- `reviewed_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())
- RLS policies for authenticated users

### 3. New Service: `slotBookingEditRequestService.ts`
- `createEditRequest()` - submit a cancel/swap request
- `getPendingEditRequests()` - fetch pending requests (for superadmin dashboard)
- `approveEditRequest()` - approve and execute the change (cancel booking or swap employee)
- `rejectEditRequest()` - reject the request

### 4. Update `BranchDashboard.tsx`
- Add a new tab trigger: "Casual Employee Schedule"
- Render the `BranchCasualSchedule` component in its `TabsContent`
- Fetch count of approved bookings for the current month to show in tab badge

### 5. New Component: `SlotBookingEditApprovals.tsx`
Add to the Superadmin Dashboard to review and approve/reject slot booking edit requests, similar to existing approval sections (GradingDeletionApprovals pattern).

### 6. Update `SuperadminDashboard.tsx`
- Import and render `SlotBookingEditApprovals` in the Overview tab
- Add pending edit request count to dashboard stats

## Technical Details

### Calendar Display
- Reuse the `Calendar` component with custom `Day` rendering
- Show only `approved` status bookings for the specific branch
- Employee names displayed as colored cards within day cells
- Month navigation for browsing past/future schedules

### Edit Request Flow
```text
Branch User clicks "Request Cancel/Swap"
  --> Creates record in slot_booking_edit_requests (status: pending)
  --> Toast: "Request submitted for superadmin approval"

Superadmin Dashboard shows pending requests
  --> Approve: executes the cancel/swap via existing slotBookingService functions
  --> Reject: updates status to rejected
```

### Query for Branch Schedule
```typescript
const { data } = await supabase
  .from('slot_bookings_new')
  .select('*')
  .eq('branch_id', branchId)
  .eq('status', 'approved')
  .gte('date', monthStart)
  .lte('date', monthEnd);
```

### Files to Create
- `src/components/dashboard/BranchCasualSchedule.tsx`
- `src/services/slotBookingEditRequestService.ts`
- `src/components/dashboard/SlotBookingEditApprovals.tsx`
- Migration for `slot_booking_edit_requests` table

### Files to Modify
- `src/components/dashboard/BranchDashboard.tsx` - add tab
- `src/components/dashboard/SuperadminDashboard.tsx` - add approval section
