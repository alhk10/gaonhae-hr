

## Plan: Add Approval Reason & View Invoice to Discount Approvals

### Problem
The Superadmin Dashboard's Invoice Discount approval cards show student name, total, and discount amount, but don't explain **why** the approval is needed (discount threshold exceeded vs. exception product) and don't let the superadmin **view the invoice line items** before approving.

### Changes

#### 1. Database Migration
Add an `approval_reason` TEXT column to `invoice_discount_approvals`:
```sql
ALTER TABLE public.invoice_discount_approvals
ADD COLUMN approval_reason TEXT;
```

#### 2. Service: Store the reason on submission
**Modified: `src/services/invoiceDiscountApprovalService.ts`**
- Add `approval_reason` to the `InvoiceDiscountApproval` interface
- Update `submitDiscountApproval` to accept and insert `approval_reason` (e.g. `"Discount exceeds $200 threshold"`, `"Includes out-of-criteria products"`, or both combined)

#### 3. InvoiceDialog: Pass the reason
**Modified: `src/components/sales/InvoiceDialog.tsx`** (lines ~961-965)
- Build a reason string based on `needsDiscountApproval` and `needsExceptionApproval` flags
- Pass it to `submitDiscountApproval`

#### 4. Approval Card UI: Show reason + expandable invoice details
**Modified: `src/components/dashboard/InvoiceDiscountApprovals.tsx`**
- Display `approval_reason` as a colored badge/tag below the discount line (e.g. amber for discount threshold, red for exception products)
- Add a collapsible/expandable section (or "View Items" toggle) showing the line items from `invoice_data.items`:
  - Product description, quantity, unit price, discount, total per item
  - Compact table or card layout consistent with existing design

### Scope
- **Migration**: 1 column addition
- **Modified**: 3 files (`invoiceDiscountApprovalService.ts`, `InvoiceDialog.tsx`, `InvoiceDiscountApprovals.tsx`)

