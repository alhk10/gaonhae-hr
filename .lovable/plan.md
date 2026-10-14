# Perth Seminars & Poomsae Competition page (/perthcomp)

## What parents will see
One public page in Gaonhae navy, red and gold (from the logo):

1. **Header**: logo, "Gaonhae Taekwondo Perth Seminars & Poomsae Championship 2026", 28 to 29 November 2026, Scarborough Community Centre 2, Function Room.
2. **Saturday 28 Nov: Seminars** ($45 each, $40 for Gaonhae students, GST included, maximum 60 per seminar)
   - Poomsae Seminar 1, 11:00am to 12:30pm, Green to Black Tip, age 7+
   - Kyorugi Seminar 1, 12:40pm to 2:10pm, Green to Red, age 7+
   - Poomsae Seminar 2, 12:40pm to 4:10pm, Poom & Dan, age 7+
   - Kyorugi Seminar 2, 4:20pm to 5:50pm, Red & above, age 9+
   - Each seminar shows the places left. A full seminar shows "Full" and cannot be selected.
3. **Sunday 29 Nov: Poomsae Competition** ($45 per entry, $40 for Gaonhae students, GST included, no spectator fee)
   - Registration closes **10 November 2026**, maximum **100 participants**. Places left are shown. After the deadline, or once full, competition entry is closed.
   - Age divisions: 5 & 6, 7 & 8, 9 to 11, 12 to 14, 15 to 17, 18 to 30, over 30
   - Male and Female
   - Poomsae: Taegeuk 1 to 8, Koryo, Keumgang, Taebaek, Pyongwon
4. **Registration form**: name, gender, date of birth, belt, club, email, mobile (+61), seminars ticked, a competition entry tick (age division and gender filled in automatically, plus a poomsae choice), indemnity tick and signature. Seminars the participant does not qualify for are greyed out, with the reason shown.
5. **Payment**: live total with the GST included, the Australian bank transfer details (GAONHAE TAEKWONDO, BSB 803-439, account 238 648 651), a payment-proof image upload, then a confirmation screen.

## Gaonhae student price
- A **"I am a Gaonhae student"** tick shows the $40 price.
- On submit, the system checks the name and date of birth against active students. A match keeps $40. If there is no match, the $45 price applies and the parent sees a note explaining why.

## Staff registration log (separate from /access)
- A small, discreet lock icon in the page footer opens a password prompt. The password is the Hp97533488 one.
- After unlocking, staff see a simple log: participant, age, gender, belt, club, contact, seminars, competition division and poomsae, amount, Gaonhae-student price yes/no, submitted date, and a payment-proof link. Totals per seminar and for the competition are shown against each cap.
- A **Download PDF** button saves the log as a PDF file.
- Nothing appears in the /access tabs, and no automatic invoices are created.

## Technical details
- Add a new page component and the `/perthcomp` route. Reuse `ProofOfPaymentUpload`, `PaymentInfoDisplay` and `SignaturePad`, plus jsPDF for the log PDF.
- One migration will:
  - Add a new table `perth_event_registrations` with grants for the service role only. No browser can read or write it directly.
  - Add `submit_perth_event_registration(jsonb)` (SECURITY DEFINER). The server sets the price ($40 only for an active student matched by name + DOB within one day, otherwise $45). It enforces eligibility, the 10 Nov deadline, the cap of 100 for the competition and 60 per seminar (under a lock, so two people cannot take the last place), and duplicate protection through a stable client reference.
  - Add `get_perth_event_availability()`, which returns only the places left.
  - Add `get_perth_event_log(p_password)`, which checks the password on the server against a stored hash and only then returns the rows. The password is never stored in the page code.
- Proofs upload to the existing private payment-proofs storage. The log shows them through short-lived signed links.

## Open question
Should the poomsae choice depend on belt (for example Taegeuk only for coloured belts, Koryo and above for Poom/Dan), or should any form be selectable?
