

## Plan: Add "Partially Paid" Status for Invoices

### Problem
When a partial payment is made, the invoice status remains as its original value (e.g., "unpaid" or "draft") instead of updating to reflect the partial payment. The system already has `partially_paid` in the DB constraint but never sets it.

### Changes

#### 1. `src/services/paymentService.ts` — Set status to "partially_paid" after partial payments

**Line 239** (createPayment): Change status logic from keeping original status to setting "partially_paid":
```typescript
const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';
```

**Line 398** (deletePayment/recalculate): Same fix:
```typescript
const newStatus = newBalanceDue <= 0 ? 'paid' : newBalanceDue < invoice.total_amount ? 'partially_paid' : 'unpaid';
```

#### 2. `src/components/dashboard/BranchDashboard.tsx` — Include "partially_paid" in the unpaid filter

**Line 279**: Add `'partially_paid'` to the unpaid status array:
```typescript
query = query.in('status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue']);
```

#### 3. `src/components/sales/InvoiceManagementList.tsx` — Display styling for partially_paid

- `getStatusBadgeVariant`: Add `case 'partially_paid': return 'outline';`
- `getStatusBadgeClass`: Add `case 'partially_paid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';`
- `getDisplayStatus`: Add `if (status === 'partially_paid') return 'Partially Paid';`

#### 4. `src/components/sales/ViewEditInvoiceDialog.tsx` — Display styling and logic for partially_paid

- Add `partially_paid` to badge variant/class/display functions (same as partial styling — yellow)
- Add `partially_paid` to the Cancel & Refund button condition (line 853)
- Lock logic: treat `partially_paid` like `paid` for approval routing

#### 5. `src/utils/invoicePDFGenerator.ts` — PDF status display

- Add color coding for `partially_paid` (yellow/orange) and display as "Partially Paid"

#### 6. Other affected files — badge/status mappings

- `src/components/dashboard/StudentDetailsDialog.tsx`: Add `partially_paid` case
- `src/components/dashboard/InvoicesCreatedSection.tsx`: Already has it
- `src/components/dashboard/BranchGradingList.tsx`: Add to status filter array
- `src/components/sales/CreatePaymentDialog.tsx`: Already handles via `balance_due > 0`
- `src/components/dashboard/UnpaidInvoiceReminderDialog.tsx`: No change needed (uses balance_due)

### Files to modify
- `src/services/paymentService.ts`
- `src/components/dashboard/BranchDashboard.tsx`
- `src/components/sales/InvoiceManagementList.tsx`
- `src/components/sales/ViewEditInvoiceDialog.tsx`
- `src/utils/invoicePDFGenerator.ts`
- `src/components/dashboard/StudentDetailsDialog.tsx`
- `src/components/dashboard/BranchGradingList.tsx`

No database changes needed — `partially_paid` is already in the constraint.

