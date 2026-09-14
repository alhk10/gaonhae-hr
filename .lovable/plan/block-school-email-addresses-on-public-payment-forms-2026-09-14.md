# Block school email addresses on public payment forms

Parents sometimes type a Gaonhae school address instead of their own, which sends confirmations to the school and makes matching impossible. These addresses will be rejected everywhere a member of the public enters an email.

## Blocked addresses

- gaonhaetaekwondo@gmail.com
- management@gaonhaetaekwondo.com
- hello@gaonhaetaekwondo.com
- kem.gaonhaetaekwondo@gmail.com
- ysn.gaonhaetaekwondo@gmail.com
- bkm.gaonhaetaekwondo@gmail.com
- jw.gaonhaetaekwondo@gmail.com

Matching ignores capitals and spaces.

## Where it applies

- Grading payment
- Event / seminar registration
- Competition registration
- Uniforms, protection guards and accessories orders
- School fees payment (both the standalone fees page and the chat-based flow)

## What the person sees

The email box shows "Please use your own email address, not a school address." and the form cannot be submitted until it is changed. Everything else on the form stays as it is.

## Also blocked behind the scenes

The same check is applied in the database when a submission is saved, so a blocked address cannot get through even if the form is bypassed. Staff entering data from the dashboard are not affected.

## Technical notes

- New `src/utils/blockedEmails.ts` exporting the list, `isBlockedEmail(value)` and the shared message; used by the existing validity checks in PublicGradingPayment, PublicCompetitionPayment, PublicSeminarPayment, PublicGuardsPurchase, PublicSchoolFeesPayment (added as a `.refine` on the existing zod schema) and PublicHelloChat.
- Database: a `public.is_blocked_public_email(text)` helper plus a BEFORE INSERT/UPDATE trigger on `grading_payment_submissions`, `competition_payment_submissions`, `seminar_payment_submissions`, `public_chat_payment_submissions` and `guards_purchases` raising a clear error when the submitted email is on the list.
- No changes to matching, invoicing or existing records; existing rows with these addresses are left untouched.
