

# Redesign Superadmin Dashboard Overview Tab

## Overview
Streamline the Superadmin Dashboard by removing several sections and adding a full slot booking management calendar with manage booking dialog -- identical to the Slot Booking page management tab.

## Changes to `SuperadminDashboard.tsx`

### Remove
1. **Header description** -- Remove the "Complete oversight of HR operations" subtitle
2. **Stats cards grid** -- Remove the entire grid of 7 stat cards (Total Employees, Pending Claims, etc.)
3. **Recent Claims section** -- Remove the card showing latest submitted claims
4. **System Status section** -- Remove the "System Operational" card
5. **Class Weekly Planner** -- Remove the `<ClassWeeklyPlanner />` component and its import
6. **Pending Student Updates alert** -- Remove the purple alert card (it relied on stats)

### Conditionally Hide
7. **Slot Booking Edit Approvals** -- Wrap `<SlotBookingEditApprovals />` to only render when `pendingEditRequestsCount > 0`

### Add
8. **Slot Booking Management Calendar** -- Add a full calendar view identical to the one in `SlotBookingManagementContent.tsx`, including:
   - Summary cards (Total Slots, Approved, Pending, Available)
   - Branch filter dropdown
   - Add Booking button and Settings button
   - Monthly calendar with color-coded booking cards per day
   - Selected date details with `BookingCardWithPay` component
   - Full "Manage Booking" dialog on click (with Cancel, Reject, Approve, Swap Employee, Change Branch actions)
   - Swap Employee dialog, Bulk Booking dialog, Cancel dialog
   - Settings dialog (Weekly Slots, Pricing, Timing tabs)

This will essentially embed `SlotBookingManagementContent` directly into the Overview tab.

### Remove unused queries/imports
- Remove `getRecentActivity`, `getDashboardStats` queries
- Remove `getAllPendingRequests` (student updates) query
- Remove `ClassWeeklyPlanner` import
- Remove stats-related state and config
- Keep queries needed for conditional rendering of approval sections (pending counts)

## Technical Approach

Rather than duplicating all the slot booking calendar code, import and render `SlotBookingManagementContent` directly inside the Overview tab. This ensures it stays identical to the slot booking page and avoids code duplication.

```tsx
import SlotBookingManagementContent from '@/components/slot-booking/SlotBookingManagementContent';

// In the Overview TabsContent, after approval sections:
<SlotBookingManagementContent />
```

### Resulting Overview Tab Layout
1. Title: "Superadmin Dashboard" (no subtitle)
2. Claims Approvals
3. Leave Approvals
4. Slot Booking Approvals
5. Payment Deletion Approvals (if any)
6. Invoice Deletion Approvals (if any)
7. Grading Deletion Approvals (if any)
8. Inventory Order Approvals
9. Slot Booking Edit Approvals (only if pending requests exist)
10. **Slot Booking Management Calendar** (full calendar + manage dialog)

### Files to Modify
- `src/components/dashboard/SuperadminDashboard.tsx`

