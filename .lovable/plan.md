# Fix: /hello payment submission fails with a database error

## What the user sees
On the /hello payment screen, after uploading proof and pressing submit, an error appears:
"new row for relation payments violates check constraint payments_verification_status_standard_check".
No payment is recorded.

## Cause (confirmed)
The payments table only accepts a verification status of `pending`, `verified`, or `rejected`.
The /hello submission routine writes `pending_verification` instead, so the database rejects
every payment it tries to record — both the credit-applied payment and the PayNow/bank
transfer payment.

## The fix
- Update the /hello submission routine so new payments are recorded as `pending`
  (the value the rest of the app already uses for "awaiting staff verification").
- Check every other routine that records payments (grading, competition, seminar, school
  fees, uniforms/guards imports) for the same wrong value, and correct any found, so the
  other public forms cannot hit the same failure.
- No change to how staff verify payments, to totals, GST, credits, or invoices.

## Verification
- Confirm the corrected routines only use allowed status values.
- Run a /hello payment end-to-end and confirm the invoice and payment are created and the
  payment shows as awaiting verification in the staff approval list.

## Technical notes
- Constraint: `payments_verification_status_standard_check` allows NULL, 'pending',
  'verified', 'rejected'.
- Offending literal `'pending_verification'` appears in `public.submit_public_chat_invoice`
  in both payment inserts (credit payment and remaining-balance payment).
- Fix delivered as a database migration replacing the affected functions; no frontend change
  expected.
