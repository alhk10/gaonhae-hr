# Temporarily disable schedule booking after school fee payment (/hello)

## What happens now
After a school fee payment is submitted in /hello, if the parent did not pre-plan lessons, they are sent to the lesson-scheduling screen (`lesson_request`) with "Schedule your lessons below."

## Change
In `src/pages/public/PublicHelloChat.tsx` (school-fees branch of the payment submit handler, ~lines 1024–1035):

- After a successful school fee payment, always go to the payment-done screen (`payment_done`) instead of the schedule-booking screen.
- Keep the existing behaviour for payments that already include pre-planned lessons (booked pending verification, or the "staff will confirm your schedule" warning).
- Show a simple success message: payment received, staff will confirm lesson times.
- Leave the scheduling code in place (comment/flag the redirect) so it can be re-enabled later.

## Not changed
- The optional "Add / confirm schedule" button before payment stays as-is.
- Grading, competition and other payment flows are untouched.

## Verification
- Typecheck/build passes.
- Manual check: school fee payment without pre-planned lessons ends on the confirmation screen, not the calendar.
