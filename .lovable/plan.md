# Plan: Grading belt promotion on result + payment date default in staff invoice creation

Two changes around staff-created grading invoices.

## 1. Belt moves up only when the grading result is pass or double

Current behaviour: creating an invoice with a Grading item (e.g. "Green Tip >> Green") creates the grading entry with the student's **current** belt — that stays as is. Setting the result today does not change the belt; the belt only moves later at certificate collection.

New behaviour — when staff set the grading result (grading list, edit dialog):

- **Pass** → student's belt moves up one level (e.g. Green Tip → Green).
- **Double** → student's belt moves up two levels (e.g. Green Tip → Blue).
- **Confirmed** or **Fail** → no belt change.
- The new belt is worked out from the belt recorded on the grading entry, and the student's belt is only ever moved **up** — if the student is already on that belt or higher (e.g. result re-saved), nothing changes.
- Every automatic belt change is recorded in the student's change history.
- Certificate collection keeps working; it will not promote a second time because the student is already on the higher belt.

## 2. Payment date defaults to the invoice date

When staff record a payment while creating an invoice, the payment date now starts as the invoice's date instead of today's date.

- Changing the invoice date also moves the payment date, unless staff have already typed a payment date themselves.
- Staff can still pick any payment date manually.

## Technical details

- `src/services/gradingPaymentSubmissionService.ts` — `adminUpdateGradingResult` (the single path used to set results) computes the target belt from the registration's `current_belt` using the existing `getNextBeltLevel` / `getDoubleBeltLevel` helpers (country-aware), then promotes `students.current_belt` only if the target is higher (`compareBeltLevels`), and writes a `student_change_logs` entry. The `admin_update_grading_result` RPC itself is unchanged.
- `src/components/sales/InvoiceDialog.tsx` — `payDate` state initialises from `formData.issue_date`; a "payment date touched" flag stops the sync once staff edit it manually; reset logic updated.
- No database or permission changes; no changes to the student portal or /hello.
