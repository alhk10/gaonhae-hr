# Remove the invoice status restriction on grading

Today a grading fee can only be invoiced or paid when the student already has a **paid or verified** invoice for the current term. That rule is what blocks grading entry for students like YUZHOU HE at Morley, and it is enforced in three places in the app (nothing in the database enforces it).

## What changes

- **Creating a grading invoice (Sales / branch dashboard):** the "no paid term invoice" check is dropped. Staff can raise a grading invoice for any student at any time — no superadmin override dialog, and no "waiting for superadmin approval" message for this reason.
- **Student portal:** "Pay grading fee" no longer opens the "Term Invoice Payment Required" warning; it goes straight into the grading payment flow.
- **/hello chat:** grading stays available regardless of whether the term fee invoice is paid (already the case, confirmed as part of this change).

Everything else about grading is untouched: fee selection by belt, slot eligibility, GST, credits, proof upload, verification and invoicing all behave exactly as now. Superadmin approval for discounts and out-of-criteria products is unaffected.

## Technical detail

- `src/components/sales/InvoiceDialog.tsx`: remove the `hasTermPaid` / `prerequisiteFailed` block, the `prerequisiteOverriddenRef` and `prerequisiteOverrideOpen` state, the override AlertDialog, and the `'Grading invoice without paid term invoice'` approval submission. The `[Superadmin override: grading prerequisite]` note and `prerequisite_overridden_by` metadata are no longer written.
- `src/components/dashboard/StudentDashboard.tsx`: remove the `currentTermInvoicePaid` query, the `showTermPaymentRequired` state and its AlertDialog; the grading action proceeds directly.
- `src/components/dashboard/InvoiceDiscountApprovals.tsx`: keep the "Grading prerequisite" label so existing pending approval requests still render correctly; no new ones will be created.
- No database or schema change; no migration.
