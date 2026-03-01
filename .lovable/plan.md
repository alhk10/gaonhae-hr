

## Plan: Add "View & Edit Bookings" Button to Quick Actions

### Changes

#### `src/components/dashboard/EmployeeDashboard.tsx`
1. Re-add `showBranchChange` state and `SlotBookingBranchChangeDialog` import
2. Add an `ArrowRightLeft` icon import
3. Insert a new "View & Edit Bookings" button immediately after the "Book Slots" button (line 644), visible only for casual employees
4. Re-add the `SlotBookingBranchChangeDialog` rendering at the bottom with the existing dialog component

This button opens the existing `SlotBookingBranchChangeDialog` which lets users view their upcoming bookings and request branch changes with superadmin approval.

