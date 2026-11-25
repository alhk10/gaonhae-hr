# Sibling discount: $5 for monthly / 4-week payments

## What changes
- Paying the **full term**: sibling discount stays as today ($20, Yishun $10).
- Paying **monthly / 4 weeks** (any class line of 4+ weeks but less than the full term): sibling discount becomes **$5**.
- Under 4 weeks: still no sibling discount.
- Monthly payers get the $5 on **each** monthly invoice in the term (October, November, December each get $5), instead of the current once-per-term limit.
- Applies the same way in /hello checkout and /access invoices (Invoice dialog and Pay School Fees dialog).

## Technical details
- `src/utils/schoolFeePlan.ts`: add `siblingDiscountAmount(weeks, termWeeks, branchId)` returning full amount when weeks >= term weeks, $5 when 4 <= weeks < term weeks, else 0; use it in the fee-plan calculation.
- `sibling_discount_used` check: only block a repeat when a full-term sibling discount was already given; monthly $5 lines allowed per invoice.
- Wire into `InvoiceDialog.tsx`, `PaySchoolFeesDialog.tsx`, `PublicHelloChat.tsx`.
- Update `schoolFeeDiscounts.test.ts` with cases: full term $20, 4 weeks $5, 3 weeks $0, Yishun full term $10 / 4 weeks $5.
- Update the class-fee discount memory.
