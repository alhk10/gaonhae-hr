# Remove the invoice status restriction on grading (staff side only)

Today a grading fee can only be invoiced when the student already has a **paid or verified** invoice for the current term. That rule is what blocks grading entry for students like YUZHOU HE at Morley. Nothing in the database enforces it — it lives in the invoice creation screen.

## What changes

- **Creating a grading invoice (Sales / branch dashboard):** the "no paid term invoice" check is dropped. Staff can raise a grading invoice for any student at any time — no superadmin override prompt, and no "waiting for superadmin approval" message for this reason.

## What stays exactly as it is

- **Student portal** — the "Term Invoice Payment Required" message and its rule are untouched.
- **/hello** — untouched.
- Grading fees, slot eligibility, GST, credits, proof upload, verification and invoicing all behave as now. Superadmin approval for discounts and out-of-criteria products is unaffected.

## Technical detail

- `src/components/sales/InvoiceDialog.tsx`: remove the `hasTermPaid` / `prerequisiteFailed` block, the `prerequisiteOverriddenRef` and `prerequisiteOverrideOpen` state, the override AlertDialog, and the `'Grading invoice without paid term invoice'` approval submission. The `[Superadmin override: grading prerequisite]` note and `prerequisite_overridden_by` metadata are no longer written.
- `src/components/dashboard/InvoiceDiscountApprovals.tsx`: keep the "Grading prerequisite" label so existing pending approval requests still render; no new ones will be created.
- `src/components/dashboard/StudentDashboard.tsx` and `src/pages/public/PublicHelloChat.tsx`: no changes.
- No database or schema change; no migration.
