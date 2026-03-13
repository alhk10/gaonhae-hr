

## Plan: Auto-Apply $20 Sibling Discount on Term Invoices

### How It Works
- Siblings are students who share the same **email address** in the `students` table.
- If a student has **2+ students** sharing their email, **all** of them get $20 off their term invoice (not just the 2nd onward — per the requirement "if the student has a sibling both enjoy $20 off").
- The discount applies only to **term invoices** (items with a `term_id` in metadata).

### Changes

#### 1. Create a sibling discount helper (`src/services/invoiceService.ts`)
- Add a function `getSiblingDiscount(studentId: string): Promise<number>` that:
  - Fetches the student's email from the `students` table
  - Counts how many **active** students share that email
  - If count >= 2, returns `20` (per additional family member beyond the first, but since both enjoy $20 off when there's a sibling, it's a flat $20 per student)
  - If count < 2 or no email, returns `0`

#### 2. Apply discount in `PaySchoolFeesDialog.tsx` (Student Dashboard)
- Query sibling discount on dialog open using the helper
- Show the discount as a line item in the price summary (e.g., "Sibling Discount: -$20.00")
- Apply it via `total_override` on the term line item (same pattern as `earlyPaymentDiscount`)
- Store `sibling_discount: 20` in the item metadata for audit trail
- Update `combinedTotal` calculation to include sibling discount

#### 3. Apply discount in `CreateInvoiceDialog.tsx` (Branch Dashboard)
- When a term product is added and a student is selected, auto-check for siblings
- If eligible, auto-apply a $20 line discount (`discount_type: 'amount'`, `discount_value: 20`) on the term line item
- Show a badge/note indicating "Sibling discount applied"
- Admin can still manually override the discount

#### 4. Apply discount in `classAttendanceService.ts` (auto-created invoices)
- The `createInvoice` call in `classAttendanceService.ts` also creates term invoices automatically
- Add sibling check before invoice creation and apply discount via `total_override` if applicable

### Files to modify
- `src/services/invoiceService.ts` — add `getSiblingDiscount()` helper
- `src/components/dashboard/PaySchoolFeesDialog.tsx` — query + apply sibling discount in UI and invoice creation
- `src/components/sales/CreateInvoiceDialog.tsx` — auto-apply discount when term item + student with siblings
- `src/services/classAttendanceService.ts` — apply sibling discount on auto-created invoices

