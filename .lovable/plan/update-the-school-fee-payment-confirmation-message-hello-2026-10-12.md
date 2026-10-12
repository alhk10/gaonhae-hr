# Update the school fee payment confirmation message (/hello)

## Change
In `src/pages/public/PublicHelloChat.tsx` (line 1035), replace the success message shown after a school fee payment:

- From: "Payment received. Our staff will confirm your lesson times with you."
- To: "Thank you for your payment. Your payment will be verified by our staff."

Nothing else changes — the payment still ends on the confirmation screen, and the schedule booking redirect stays bypassed.

## Not changed
- The confirmation screen bubble ("Thanks! Your payment has been received and is pending verification.") already matches this wording and stays as-is.
- Messages for payments that included pre-planned lessons ("Your lessons are booked, pending verification." and the schedule-save warning) are untouched.
- Grading, competition and other payment flows are untouched.

## Verification
- Typecheck/build passes.
- Manual check: after a school fee payment without pre-planned lessons, the new message appears and the parent lands on the confirmation screen.
