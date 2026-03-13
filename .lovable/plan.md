

## Plan: Lock Paid Invoices, Rename Edit to Adjustments, Add Cancel & Refund with Approval

### Overview
Lock paid/verified invoices from direct editing, rename "Edit" to "Adjustments", and add a "Cancel Invoice & Refund" button. Both adjustments and cancellations require superadmin approval for non-superadmin users.

### Database Changes

**New table: `invoice_action_requests`**
- `id` (uuid, PK)
- `invoice_id` (uuid, FK to invoices)
- `action_type` (text: 'adjustment' or 'cancellation')
- `request_data` (jsonb — stores edited items/notes for adjustments, or cancellation reason for cancellations)
- `requested_by` (uuid)
- `requested_by_email` (text)
- `invoice_number` (text)
- `student_name` (text)
- `status` (text: 'pending', 'approved', 'rejected')
- `reviewed_by` (uuid, nullable)
- `reviewed_at` (timestamptz, nullable)
- `rejection_reason` (text, nullable)
- `created_at` (timestamptz)

**Migration**: Add `'cancelled'` to the invoice status check constraint if not already present. Add `'refunded'` status if needed for tracking.

RLS: Same pattern as `invoice_discount_approvals`.

### Code Changes

#### 1. `src/services/invoiceActionRequestService.ts` (new)
- `submitActionRequest(invoiceId, actionType, requestData, invoiceNumber, studentName, email)` — inserts pending request
- `getPendingActionRequests()` — fetch all pending requests
- `approveActionRequest(id)` — approve and execute (for adjustments: apply edits; for cancellations: set status to 'cancelled', refund payments as student credits)
- `rejectActionRequest(id, reason)` — reject with reason

#### 2. `src/components/sales/ViewEditInvoiceDialog.tsx` (modify)
- **Lock paid/verified invoices**: When `invoice.status` is `'paid'` or `'verified'`, hide the edit/adjustment button for non-superadmins, or show it but route through approval
- **Rename "Edit" button to "Adjustments"**: Change label and icon
- **Add "Cancel Invoice & Refund" button**: Visible in view mode, red/destructive styling
  - For superadmins: execute immediately (cancel invoice, refund payments as student credits)
  - For non-superadmins: submit approval request with a reason dialog
- **Adjustment flow for paid invoices**:
  - For superadmins: save directly as before
  - For non-superadmins: save creates an approval request instead of applying changes

#### 3. `src/components/dashboard/InvoiceActionApprovals.tsx` (new)
- Display pending adjustment and cancellation requests on superadmin dashboard
- Show action type, invoice number, student name, requester
- Approve/reject buttons with reason dialog for rejections

#### 4. `src/components/dashboard/SuperadminDashboard.tsx` (modify)
- Import and render `InvoiceActionApprovals` component

#### 5. `src/services/invoiceService.ts` (modify)
- Add `cancelInvoice(invoiceId)` function: sets status to `'cancelled'`, refunds all payments as student credits, deactivates entitlements/enrollments

### UI Behavior Summary
- **Unpaid/partial invoices**: "Adjustments" button works as current edit (direct save)
- **Paid/verified invoices**: 
  - Superadmins: can adjust directly and cancel directly
  - Non-superadmins: adjustments and cancellations submit approval requests
- **Cancel & Refund**: Shows confirmation dialog with reason field. On approval/execution, invoice status becomes 'cancelled', all payments refunded as student credits

### Files to create
- `src/services/invoiceActionRequestService.ts`
- `src/components/dashboard/InvoiceActionApprovals.tsx`

### Files to modify
- `src/components/sales/ViewEditInvoiceDialog.tsx`
- `src/components/dashboard/SuperadminDashboard.tsx`
- `src/services/invoiceService.ts`
- `src/integrations/supabase/types.ts`
- New migration for `invoice_action_requests` table and status constraint update

