

## Plan: Unified Invoice Dialog with Line-Item Refund

### Problem
Two separate dialogs exist for invoice management (~3500 lines combined). The user wants a single unified dialog based on CreateInvoiceDialog's layout that handles create, view, edit, adjust, and refund — including the ability to **refund individual line items** (not just whole-invoice cancellation).

### Approach
This is a very large refactor. To manage complexity, the plan is split into phases.

---

### Phase 1: Add Line-Item Refund Service

**New: `src/services/invoiceRefundService.ts`**
- `refundLineItem(invoiceItemId, reason)`: Refunds a single line item by:
  1. Fetching the item's `total_amount` and parent invoice's `student_id`
  2. Creating a `student_credits` entry (type: `refund`, reference_id: item id, description: "Refund for [product] from Invoice #X")
  3. Deactivating the item's entitlement (`is_active = false`)
  4. Cancelling any enrollment tied to the item
  5. Marking the item with metadata `{ refunded: true, refund_reason, refunded_at }`
  6. Recalculating the invoice totals (subtract refunded item from `total_amount`, `tax_amount`, update `balance_due`)
  7. Logging via `invoiceChangeLogService`
- `refundLineItemRequest(invoiceItemId, reason, invoiceNumber, studentName, requestedBy)`: For non-superadmins, submits an `invoice_action_requests` entry with `action_type: 'item_refund'` and `action_data: { item_id, reason }`

### Phase 2: Unified InvoiceDialog Component

**New: `src/components/sales/InvoiceDialog.tsx`**

Built on CreateInvoiceDialog's codebase with these additions:

**Props:**
```typescript
interface InvoiceDialogProps {
  mode: 'create' | 'view' | 'edit';
  trigger?: React.ReactNode;
  invoiceId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInvoiceCreated?: () => void;
  onInvoiceUpdated?: () => void;
  branchId?: string;
}
```

**Layout (single scrollable dialog, no tabs):**
1. **Header**: "Create Invoice" or "Invoice #INV-XXX" + status badge + action buttons (Edit, Adjustments, Cancel & Refund)
2. **Invoice Details**: Branch, Student, Invoice Number (read-only/auto), Invoice Date. **Removed**: due date, internal notes
3. **Line Items**: Editable table/cards (create & edit) or read-only (view). Each item row in view mode gets a **"Refund" button** (trash/undo icon) for individual item refund. Terms remain per-line-item.
4. **Totals**: Subtotal, tax, total, balance due. Shows refunded amounts if any items refunded.
5. **Payments Section** (view/edit only, at bottom): List of payments with status. "Record Payment" button. Unpaid invoices show payment method info.
6. **Footer**: Mode-dependent action buttons

**Line-Item Refund UI in View Mode:**
- Each line item card/row shows a "Refund" button (only for non-cancelled, non-refunded items on paid/partially_paid invoices)
- Clicking opens a confirmation popover/dialog asking for a reason
- Superadmins execute immediately; non-superadmins submit approval request
- Refunded items display with strikethrough styling and a "Refunded" badge

### Phase 3: Update Consumers & Cleanup

**Modified files:**
- `src/components/sales/InvoiceManagementList.tsx` — replace both dialog imports with `InvoiceDialog`
- `src/components/dashboard/BranchDashboard.tsx` — same
- `src/components/dashboard/InvoiceDeletionApprovals.tsx` — same
- `src/components/dashboard/InvoiceActionApprovals.tsx` — handle `item_refund` action type approval

**Deleted:**
- `src/components/sales/ViewEditInvoiceDialog.tsx`

**Preserved (moved into InvoiceDialog):**
- Cancel & Refund whole-invoice sub-dialog
- Payment deletion request sub-dialog
- Invoice change log dialog
- Edit/adjustment approval flow for non-superadmins

### Phase 4: Handle Item Refund Approvals

**Modified: `src/components/dashboard/InvoiceActionApprovals.tsx`**
- Display `item_refund` requests alongside `cancellation` and `adjustment` requests
- On approval, call `refundLineItem()` from the new service

**Modified: `src/services/invoiceActionRequestService.ts`**
- Ensure `action_type: 'item_refund'` is supported in `submitActionRequest`

---

### Scope Summary
- **New**: `invoiceRefundService.ts`, `InvoiceDialog.tsx`
- **Modified**: `InvoiceManagementList.tsx`, `BranchDashboard.tsx`, `InvoiceDeletionApprovals.tsx`, `InvoiceActionApprovals.tsx`, `invoiceActionRequestService.ts`
- **Deleted**: `ViewEditInvoiceDialog.tsx`
- **Renamed/kept as wrapper**: `CreateInvoiceDialog.tsx` (thin re-export for any remaining imports)
- No database migrations needed (uses existing `invoice_items.metadata`, `student_credits`, `invoice_action_requests` tables)

