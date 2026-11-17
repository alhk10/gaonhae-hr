# Fix "Failed to create invoice" (Balmoral password session)

## What I found
- The screen is the Balmoral-only password session creating a 3-line Classes invoice ($441.45, SG 9% GST excluded — correct for Balmoral).
- No invoice save request reached the database in the last 6 hours (no create-invoice call, no failed insert, no database error). So the save is failing inside the page before it is sent.
- The invoice form catches every error and shows only the generic "Failed to create invoice", hiding the real reason. The exact cause is not confirmed yet.

## Plan
1. Show the real reason in the error message (keep the generic text only as a fallback), and log the full error to the console.
2. Reproduce with the Balmoral password: same student, same three Term 4 2026 Classes lines (1x Weekday qty 1 @ $50, 2x Weekday qty 4 @ $63.75, 1x Weekday qty 2 @ $50).
3. Fix the step that throws. Likely suspects to check in order:
   - the password session falling back to the signed-in table-write path instead of the secure database function;
   - the pre-save checks (credit balance lookup, discount/exception approval, duplicate-class checks) throwing on the edited price or repeated product;
   - the payload shape rejected by the secure create function.
4. Confirm the invoice saves once and appears in the Balmoral invoice list with the right total, then delete the test invoice.

## Technical details
- `src/components/sales/InvoiceDialog.tsx` handleSubmit: replace `catch { toast.error('Failed to create invoice') }` with a message from the caught error.
- Check `onSubmitOverride` is passed for every /access entry point that opens this dialog (Students tab, profile, Invoices tab).
- Reproduce via Playwright against /access with the Balmoral password.
