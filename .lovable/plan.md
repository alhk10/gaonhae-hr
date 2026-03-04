

## Plan: Remove Duplicated Slot Booking Approval Sections

### Problem
The Superadmin Dashboard renders `SlotBookingApprovals` (line 93) as a standalone section, AND `SlotBookingManagementContent` (line 129) which has its own built-in "Pending Approvals" section. This causes the same pending slot booking approvals to appear twice.

### Fix

**`src/components/dashboard/SuperadminDashboard.tsx`**:
- Remove the standalone `<SlotBookingApprovals />` component (line 93-94) since `SlotBookingManagementContent` already handles pending approvals with approve/reject actions inline.

This keeps the approvals integrated within the slot booking management calendar context where they are most useful, and eliminates the duplication.

