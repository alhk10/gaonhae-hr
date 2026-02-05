
# Add Approval Sections to Superadmin Dashboard

## Overview
Add three new approval sections to the Superadmin Dashboard for Claims, Leave, and Slot Booking approvals. These will follow the same pattern as the existing `PaymentDeletionApprovals` and `InventoryOrderApprovals` components.

## Current State
- Superadmin Dashboard already has approval sections for Payment Deletions, Invoice Deletions, and Inventory Orders
- The dashboard shows stats for pending claims but lacks actionable approval UI
- Leave requests and slot bookings have approval functionality in their respective management pages but not on the dashboard

## Implementation Plan

### 1. Create ClaimsApprovals Component
**File:** `src/components/dashboard/ClaimsApprovals.tsx`

A new component that:
- Fetches pending claims using the existing `getClaims` service
- Displays a table with employee name, claim type, amount, date, and description
- Shows receipt preview link if available
- Provides Approve/Reject buttons with confirmation dialogs
- Uses the existing `updateClaimStatus` function for status changes
- Matches the visual style of existing approval components

### 2. Create LeaveApprovals Component
**File:** `src/components/dashboard/LeaveApprovals.tsx`

A new component that:
- Fetches pending leave requests using `getAllLeaveRequests` service
- Displays employee name, leave type, date range, days requested, and reason
- Shows medical certificate link for sick leave if available
- Provides Approve/Reject buttons
- Uses `updateLeaveStatus` for status changes

### 3. Create SlotBookingApprovals Component
**File:** `src/components/dashboard/SlotBookingApprovals.tsx`

A new component that:
- Fetches pending slot bookings using `getAllSlotBookings` service
- Displays employee name, branch, date, and notes
- Provides Approve/Reject/Approve All buttons
- Uses existing `updateSlotBookingStatus` function

### 4. Update Superadmin Dashboard
**File:** `src/components/dashboard/SuperadminDashboard.tsx`

- Import the three new approval components
- Add queries to fetch pending counts for leave and bookings
- Update the stats cards to include pending leave and pending bookings counts
- Add the approval components to the Overview tab (after the recent claims card, before deletion approvals)
- Only show each section when there are pending items (consistent with existing pattern)

### 5. Update Dashboard Stats Service
**File:** `src/services/dashboardOptimizationService.ts`

- Add `pendingLeave` and `pendingBookings` to the `DashboardStats` interface
- Update `getDashboardStats` to fetch these additional counts

---

## Technical Details

### Component Structure (ClaimsApprovals example)
```typescript
const ClaimsApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['pending-claims-approvals'],
    queryFn: async () => {
      const allClaims = await getClaims();
      return allClaims.filter(c => c.status === 'Pending');
    },
    staleTime: 30 * 1000,
  });
  
  // Approve/Reject mutations
  // Table with actions
};
```

### Stats Card Updates
Add two new stat cards:
- **Pending Leave**: Shows count of pending leave requests
- **Pending Bookings**: Shows count of pending slot bookings

### Query Keys
- `pending-claims-approvals`
- `pending-leave-approvals`
- `pending-booking-approvals`
- `dashboard-stats` (updated to include new counts)

---

## Files to Create
1. `src/components/dashboard/ClaimsApprovals.tsx`
2. `src/components/dashboard/LeaveApprovals.tsx`
3. `src/components/dashboard/SlotBookingApprovals.tsx`

## Files to Modify
1. `src/components/dashboard/SuperadminDashboard.tsx`
2. `src/services/dashboardOptimizationService.ts`
