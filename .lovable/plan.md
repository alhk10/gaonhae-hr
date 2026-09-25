# Plan: Grading belt auto-update + payment date default in staff invoice creation

Two small changes to the staff Create Invoice flow (branch dashboard / student dialog "+" button).

## 1. Automatically update the student's belt when a grading item is invoiced

When staff create an invoice containing a Grading item (e.g. "Green Tip >> Green"), the student's belt is automatically set to the target belt ("Green").

- The invoice creation code already reads the belt transition from the grading product name and creates the grading entry — the belt update is added in the same place.
- The belt only moves **up**: if the student is already on the target belt or higher, nothing changes (avoids demoting a student when an old grading is invoiced late).
- Every automatic belt change is recorded in the student's change history, marked as coming from the invoice.
- Also applies when a grading item is added while editing an existing invoice.
- The normal grading flow (results, certificate collection) is untouched.

## 2. Payment date defaults to the invoice date

When staff record a payment while creating an invoice, the payment date now starts as the invoice's date instead of today's date.

- Changing the invoice date also moves the payment date, unless staff have already typed a payment date themselves.
- Staff can still pick any payment date manually.

## Technical details

- `src/services/invoiceService.ts` — in the existing grading-registration block (and the edit-invoice equivalent), after parsing the "From >> To" transition, promote `students.current_belt` to the parsed target belt using the existing belt-order helpers (`compareBeltLevels`), skipping equal/lower targets; write a `student_change_logs` entry.
- `src/components/sales/InvoiceDialog.tsx` — `payDate` state initialises from `formData.issue_date`; a "payment date touched" flag stops the sync once staff edit it manually; reset logic updated.
- No database or permission changes; no changes to the student portal or /hello.
