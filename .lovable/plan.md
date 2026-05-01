## Issue

On the Branch Dashboard's "Invoices & Payments" list, the "Add Payment" ($) icon does not appear for invoices with status `partially_paid`. In the screenshot, Emily Hana Horsfall's invoice (`partially_paid`) is missing the $ button while all `draft` invoices have it.

## Root cause

In `src/components/dashboard/BranchDashboard.tsx` (line 1729), the conditional uses `'partial'`:

```ts
['draft', 'sent', 'unpaid', 'partial', 'overdue'].includes(invoice.status)
```

But the actual status string saved in the DB (per memory & `InvoiceManagementList`) is `'partially_paid'`, so the check fails and the button is hidden.

## Fix

Update the whitelist in `BranchDashboard.tsx` to include `'partially_paid'`:

```ts
['draft', 'sent', 'unpaid', 'partially_paid', 'partial', 'overdue'].includes(invoice.status)
```

(Keeping `'partial'` as a safe fallback in case any legacy rows use it.)

## Scope

- Single-line frontend change in `src/components/dashboard/BranchDashboard.tsx` around line 1729.
- No DB, service, or business-logic changes.
- Verify by checking that Emily's `partially_paid` invoice now shows the $ icon and opens `CreatePaymentDialog` with the remaining balance.