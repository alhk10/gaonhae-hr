

# Add Invoice & Payment Buttons to Branch Dashboard

## Overview
Add "Create Invoice" and "Record Payment" action buttons to the Invoice & Payment tab header in the Branch Dashboard, reusing the existing `CreateInvoiceDialog` and `CreatePaymentDialog` components.

## What Changes

### Visual Layout
The Invoice & Payment tab will gain two action buttons in the header area (next to the title), matching the pattern used in the Students tab (which has "Add Student/Trial"):
- **Create Invoice** button (primary) -- opens the existing `CreateInvoiceDialog`
- **Record Payment** button (outline) -- opens the existing `CreatePaymentDialog`

After creating an invoice or payment, the branch invoices query will be refetched automatically.

## Technical Details

### File to Modify: `src/components/dashboard/BranchDashboard.tsx`

1. **Import** `CreateInvoiceDialog` from `@/components/sales/CreateInvoiceDialog` and `CreatePaymentDialog` from `@/components/sales/CreatePaymentDialog`
2. **Add** `FileText` and `DollarSign` icons to the lucide imports
3. **Update the Invoice & Payment `TabsContent`** (lines 374-405):
   - Move the action buttons into the `CardHeader` area alongside the title
   - Add `CreateInvoiceDialog` with a trigger button labeled "Create Invoice"
   - Add `CreatePaymentDialog` with a trigger button labeled "Record Payment"
   - Both dialogs receive an `onInvoiceCreated` / `onPaymentCreated` callback that invalidates the `branch-invoices` and `outstanding-invoices` queries via `queryClient`

### No New Files or Database Changes Required
Both dialog components already exist and handle their own form logic, validation, and data submission. The branch dashboard simply wraps them with trigger buttons and refreshes data on completion.

