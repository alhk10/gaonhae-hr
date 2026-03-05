

## Plan: UI Cleanup and Early Payment Discount

### Changes

**File: `src/components/dashboard/ClassScheduleSelector.tsx`**
1. Remove the "X of Y sessions selected" text from the summary footer (lines 337-340). Keep the limit info on the left.

**File: `src/components/dashboard/PaySchoolFeesDialog.tsx`**
1. Remove the "Rate" row from the summary card (lines 899-902).
2. Add an early payment discount: compute whether today is on or before the selected term's `start_date`. If so, apply a `$10` discount and show it as a labeled row in the summary (e.g., "Early Payment Discount: -$10.00") between School Fees and Total.
3. Update `combinedTotal` to subtract the discount.
4. Pass the discount into the invoice creation so the invoice reflects it (add as a discount line item or adjust the total).

### Details
- The $10 discount is automatic and non-configurable — applied whenever the payment date (today) is on or before `selectedTerm.start_date`.
- The discount row only appears in the summary when applicable.
- The invoice item metadata will include `early_payment_discount: true` for audit trail.

