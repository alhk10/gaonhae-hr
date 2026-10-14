# Perth Seminars & Poomsae Competition page (/perthcomp)

## What parents will see
One public page using Gaonhae navy, red and gold (from the logo):

1. **Header**: logo, "Gaonhae Taekwondo Perth Seminars & Poomsae Championship 2026", 28 to 29 November 2026, Scarborough Community Centre 2, Function Room.
2. **Saturday 28 Nov: Seminars** ($45 each, $40 for Gaonhae students, GST included)
   - Poomsae Seminar 1, 11:00am to 12:30pm, Green to Black Tip, age 7+
   - Kyorugi Seminar 1, 12:40pm to 2:10pm, Green to Red, age 7+
   - Poomsae Seminar 2, 12:40pm to 4:10pm, Poom & Dan, age 7+
   - Kyorugi Seminar 2, 4:20pm to 5:50pm, Red & above, age 9+
3. **Sunday 29 Nov: Poomsae Competition** ($45 per entry, $40 for Gaonhae students, GST included, no spectator fee)
   - Age divisions: 5 & 6, 7 & 8, 9 to 11, 12 to 14, 15 to 17, 18 to 30, over 30
   - Male and Female
   - Poomsae: Taegeuk 1 to 8, Koryo, Keumgang, Taebaek, Pyongwon
4. **Registration form**: name, gender, date of birth, belt, club, email, mobile (+61), seminars ticked, a competition entry tick (with the participant's age division and gender filled in automatically, plus a poomsae choice), indemnity tick and signature.
   - A seminar is greyed out, with the reason shown, if the participant's belt or age does not qualify.
   - The poomsae choice is limited to the participant's belt level. This is still to be confirmed (see the question below).
5. **Payment**: live total with the GST included, the Australian bank transfer details (GAONHAE TAEKWONDO, BSB 803-439, account 238 648 651), a payment-proof image upload, then a confirmation screen.

## Gaonhae student price
- A **"I am a Gaonhae student"** tick shows the $40 price straight away.
- On submit, the system checks the name and date of birth against active students. If it finds a match, $40 applies. If not, the $45 price applies and the parent sees a note explaining why.

## Staff side
- Seminar entries appear in the existing **/access Seminars** tab as event "2026 Perth Seminars (28 Nov)". Competition entries appear in **/access Competitions** as "2026 Perth Poomsae Championship (29 Nov)".
- The usual flow applies for both: verify, match, automatic invoice for the Morley branch with GST included, refunds as credit, and duplicate protection.
- Staff can change prices and details later in the existing event settings.

## Technical details
- Add a new page component and the `/perthcomp` route. Reuse `ProofOfPaymentUpload`, `PaymentInfoDisplay`, `SignaturePad`, the duplicate-submission service and stable client references.
- One migration will:
  - Create the Perth seminar event (4 packages, Morley branch) and the Perth competition event (the "Poomsae Entry" category; the coaching fee is not required and is $0).
  - Add `submit_perth_event_registration(jsonb)` (SECURITY DEFINER). It recomputes the price on the server: $40 only for a matched active student (name + DOB, with one-day tolerance), otherwise $45. It enforces belt and age eligibility, then writes the rows to `seminar_payment_submissions` and/or `competition_payment_submissions` under one shared client reference so nothing is duplicated.
- The price is never taken from what the browser sends.

## Open question
Should the poomsae choice depend on belt (for example Taegeuk only for coloured belts, Koryo and above for Poom/Dan), or should any form be selectable?
