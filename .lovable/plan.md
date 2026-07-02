## Plan

Make each employee name in the **Payment Processing** table (`src/pages/PayrollProcessing.tsx`, the step shown in your screenshot) clickable. Clicking opens a small read-only dialog with:

- Employee Name (display_name || name)
- Date of Birth (DD/MM/YYYY via `formatDate`)
- NRIC / FIN
- Bank Account Name (the employee's legal name — from `employees.name`)
- Bank Account Number
- Bank Name (added for context since it's already in the row)

### Changes
- `src/pages/PayrollProcessing.tsx`
  - Add `selectedPayeeId` state and a new `EmployeePayeeDialog` component (inline or new file).
  - Render name cells as a `<button>` with `underline hover:text-primary`, `onClick` sets the id.
  - Dialog fetches the full employee record from the already-loaded `availableEmployees` list (no extra query) and shows the 5 fields in a two-column read-only layout.
  - Superadmin-only? — assume visible to anyone who can already see this Payment Processing step (no extra gating), since the bank number is already displayed in the same row.

### Out of scope
- No editing from the dialog (view only).
- No changes to the casual/full-time payroll calculations or the "Paid" checkbox behavior.

Confirm and I'll implement.