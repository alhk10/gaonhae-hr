

## Plan: Show All Products but Require Approval for Out-of-Criteria Selections

### Problem
Currently, products are filtered by the student's belt level, age, and class type settings — hiding products the student doesn't normally qualify for. However, branch admins may grant exceptions, so all products should remain visible. Invoices with out-of-criteria products should require superadmin approval.

### Changes

#### 1. Remove belt/age filtering from product list (`CreateInvoiceDialog.tsx`)
- In the `filteredProducts` filter (~line 1092-1109), remove `matchesBelt`, `matchesAge`, and keep only `matchesCategory`, `matchesGradingBelt` (grading products should still filter by belt transition since they're belt-specific by nature), and `notHidden`
- Products that don't match belt/age criteria will still appear but can be visually distinguished

#### 2. Flag out-of-criteria products with a visual indicator
- Add a helper `isOutOfCriteria(product)` that returns true if the product fails belt or age checks
- In the `ProductSearchSelect` dropdown, show a small warning badge or muted text (e.g., "(exception)") next to out-of-criteria products so the admin knows

#### 3. Require superadmin approval for exception invoices
- In `handleCreateInvoice` (~line 713), add a check: if any line item uses an out-of-criteria product and user is not superadmin, route the invoice through the existing `submitDiscountApproval` flow (or a similar approval mechanism)
- Store `exception_approval: true` in the invoice metadata to distinguish from discount approvals
- Show a toast: "This invoice includes products outside the student's criteria and requires superadmin approval."

### Files to modify
- `src/components/sales/CreateInvoiceDialog.tsx` — remove strict filtering, add out-of-criteria detection, route to approval

