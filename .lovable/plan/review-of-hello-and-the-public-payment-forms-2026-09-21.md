# Review of /hello and the public payment forms

I checked the six public payment flows (/hello chat, school fees, grading, competition, seminar, uniforms & guards), the services behind them and the database functions they call. Below is what I found, worst first, with what I would do about each.

## What is already working well

- Every submit button is disabled while a submission is in progress, so a double tap cannot create two records.
- Proof of payment is image-only everywhere, with a 5 MB limit, enforced by one shared upload component.
- School email addresses are blocked on all six forms, case- and space-insensitive.
- Student credit is applied by the database itself (held until staff verify), so the amount the parent sees and the amount recorded agree.

## Issues found

### 1. The new screenshot check is never saved for /hello payments (high)
Payments made inside /hello are written straight to an invoice and payment record — they never create a row in the submissions table that the screenshot result is saved against. So the automatic amount check runs and shows the parent a result, but staff never see it for /hello payments.
Fix: save the result against the /hello payment record instead, and show it in the approvals view.

### 2. /hello invoices record zero GST (high)
For Singapore branches, /hello builds the total with 9% GST added but then stores the invoice with GST of zero, and puts the difference on a line called "Singapore branch adjustment". That contradicts the GST work done on every other flow and understates tax on those invoices.
Fix: split the GST out properly on /hello invoices (subtotal + 9% GST = total received), and replace the adjustment line with proper per-line pricing where possible.

### 3. A timed-out competition or seminar submission can be submitted twice (high)
Those two services automatically retry the submission up to three times when the network times out. If the first attempt actually succeeded but the reply was lost (common on event-day mobile data), the parent gets two registrations and two payment records.
Fix: send a one-time reference generated in the browser with each submission and have the database ignore a repeat of the same reference.

### 4. Date of birth can be set in the future (medium)
The year list stops at this year, but a parent can still pick a month and day later this year. Nothing rejects it, and a wrong birth date breaks automatic matching later.
Fix: reject any birth date after today on all six forms.

### 5. Australia branches get no GST on school fees and grading (medium)
Those two pages apply 9% only when the branch is in Singapore; competition, seminar and guards correctly apply 10% for Australia. An Australian school fee or grading payment therefore records no tax.
Fix: use the same country-based rate everywhere.

### 6. A booking failure after payment is hidden from the parent (medium)
In /hello, if saving the chosen lesson times fails after the payment is accepted, the error is swallowed and the parent is still told "Your lessons are booked".
Fix: tell the parent the payment went through but the schedule needs to be confirmed, and flag it for staff.

### 7. Proof file checks only exist in the browser (low)
Only the guards flow re-checks the file type before uploading. The others trust the upload control.
Fix: add the same check in the remaining five services.

### 8. Credit could in theory be spent twice (low)
Two tabs open at once both see the full credit balance; nothing locks the balance while a payment is being placed.
Fix: lock the student's credit row inside the payment function.

## Suggested order of work

1. Items 1 and 2 (screenshot result and GST on /hello) — these affect money and daily staff work.
2. Item 3 (duplicate submissions) before the next competition or grading event.
3. Items 4, 5, 6 together as a validation and messaging pass.
4. Items 7 and 8 as hardening.

## Technical notes

- `/hello` payments go through `submit_public_chat_invoice`, which writes `invoices` + `payments` only; `public_chat_payment_submissions` is empty (0 rows), so `record_proof_scan_by_session` can never find a row. Scan fields should move onto `payments` (or be keyed by `invoice_id`), and `proofScanLookupService` / `UnifiedSubmissionApprovals` extended accordingly.
- `submit_public_chat_invoice` sets `tax_amount = 0` and pushes the GST difference into the `PUBLIC-HELLO-SG-ADJUSTMENT` line; change it to `subtotal = round(total/1.09, 2)` style splitting used by the other import paths.
- `competitionPaymentSubmissionService.ts` (`retry` around `submit_competition_payment`) and `seminarPaymentSubmissionService.ts` (same pattern) need a client-generated `p_client_ref`, stored unique, returning the existing row on conflict.
- GST rate helpers: `PublicSchoolFeesPayment.tsx` and `PublicGradingPayment.tsx` hardcode `GST_RATE = 0.09` with an `isSingapore` flag; reuse the `gstRateForCountry` helper the competition/seminar pages use.
