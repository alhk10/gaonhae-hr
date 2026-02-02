

# Payment Deletion Approval System

## Overview
This plan implements a two-step approval workflow for payment deletions. When a user wants to delete a payment, instead of immediate deletion, the request is queued for superadmin approval. Superadmins will see these pending requests in a new "Approvals" section on their dashboard.

## Architecture

### Database Changes
A new table `payment_deletion_requests` will store pending deletion requests:

```text
+----------------------------------+
|   payment_deletion_requests       |
+----------------------------------+
| id (uuid, PK)                    |
| payment_id (uuid, FK -> payments)|
| requested_by (text)              |
| requested_by_email (text)        |
| reason (text, optional)          |
| status (pending/approved/rejected)|
| reviewed_by (text, optional)     |
| reviewed_at (timestamp, optional)|
| created_at (timestamp)           |
+----------------------------------+
```

### Request Flow

```text
1. User clicks Delete on payment
         |
         v
2. Confirmation dialog with reason field
         |
         v
3. Creates record in payment_deletion_requests (status: 'pending')
         |
         v
4. Toast: "Deletion request submitted for approval"
         |
         v
5. Superadmin sees request in Dashboard Approvals section
         |
         v
6. Superadmin Approves/Rejects
         |
    +----+----+
    |         |
Approve    Reject
    |         |
    v         v
Deletes    Updates
payment    status
+ updates  to
invoice    'rejected'
```

## Implementation Details

### 1. Database Migration
Create new table with RLS policies:
- **Table**: `payment_deletion_requests`
- **Columns**: id, payment_id, requested_by, requested_by_email, reason, status, reviewed_by, reviewed_at, created_at
- **RLS Policies**:
  - Authenticated users can INSERT (to create requests)
  - Authenticated users can SELECT their own requests
  - Superadmins can SELECT all requests
  - Superadmins can UPDATE requests (for approval/rejection)
  - Superadmins can DELETE requests

### 2. Payment Deletion Request Service
New file: `src/services/paymentDeletionRequestService.ts`

Functions:
- `createDeletionRequest(paymentId, reason?)` - Creates a pending request
- `getPendingDeletionRequests()` - For superadmin dashboard
- `approveDeletionRequest(requestId)` - Approves and executes deletion
- `rejectDeletionRequest(requestId)` - Marks request as rejected

### 3. UI Components

**A. Payment Management List Update**
- Modify delete button behavior:
  - Instead of calling `deletePayment()` directly, open a dialog
  - Dialog contains reason field (optional) and Submit button
  - Calls `createDeletionRequest()` instead

**B. New Approval Section Component**
New file: `src/components/dashboard/PaymentDeletionApprovals.tsx`
- Card showing pending deletion requests count
- Table with: Payment #, Invoice #, Amount, Requested By, Date, Reason, Actions
- Actions: Approve (green check) and Reject (red X) buttons
- Approve triggers `approveDeletionRequest()` which:
  1. Calls existing `deletePayment()` logic
  2. Updates request status to 'approved'
- Reject triggers `rejectDeletionRequest()`

**C. Superadmin Dashboard Integration**
- Add new card in stats row: "Pending Payment Deletions"
- Add new section below existing cards with `PaymentDeletionApprovals` component

### 4. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | Create | New table and RLS policies |
| `src/services/paymentDeletionRequestService.ts` | Create | Service for deletion requests |
| `src/components/sales/PaymentManagementList.tsx` | Modify | Replace direct delete with request dialog |
| `src/components/dashboard/PaymentDeletionApprovals.tsx` | Create | Approval UI component |
| `src/components/dashboard/SuperadminDashboard.tsx` | Modify | Add approvals section and stat card |
| `src/integrations/supabase/types.ts` | Update | Auto-updated with new table types |

## Technical Notes

### Security Considerations
- RLS ensures only authenticated users can create deletion requests
- Only superadmins (validated via `get_current_user_role()`) can approve/reject
- The actual payment deletion only happens after superadmin approval
- All actions are logged for audit trail

### Existing Pattern Alignment
This follows the same approval pattern used for:
- Leave requests (`leave_requests` table with status field)
- Claims approval (claims table with Pending/Approved/Rejected status)
- Slot booking approvals (AdminSlotBooking.tsx pending approvals dialog)

### User Experience
- Regular users see "Request sent for approval" message
- Superadmins see pending count badge in dashboard
- Clear approve/reject actions with confirmation
- Toast notifications for all state changes

