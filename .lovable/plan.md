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
3. **Sunday 29 Nov: Poomsae Competition** ($45 per event, $40 for Gaonhae students, GST included, no spectator fee)
   - Registration closes **10 November 2026**, maximum **100 participants**. Places left are shown. After the deadline, or once full, competition entry is closed.
   - An information section shows your rules: participation by invited clubs only; eligibility, age categories, events and event eligibility; competition structure and group allocation.
   - **Age divisions (by birth year)**: 4–6, 7–8, 9–11, 12–14, 15–17, 18 & above. Age = 2026 minus birth year.
   - **Gender**: Male / Female.
   - **Geup events**: Geup 10 & 9 Taegeuk 1; 8 & 7 Taegeuk 2; 6 Taegeuk 3; 5 Taegeuk 4; 4 Taegeuk 5; 3 Taegeuk 6; 2 Taegeuk 7; 1 Taegeuk 8.
   - **Poom/Dan events**: Taegeuk 7, Taegeuk 8, Koryo, Keumgang, Taebaek.
   - **Event eligibility**: competitors can enter their own grade event and higher grade events, never a lower one. Poom/Dan holders can enter only Poom/Dan events. **Maximum 2 events.** The grade used is the rank at registration.
   - **Grade, not belt colour**: clubs use different belt systems, so the form asks for the competitor's **grade**: Geup 10 to Geup 1, or Poom/Dan. The available poomsae events follow that grade.
   - Gaonhae students can pick their Gaonhae belt instead, and it maps automatically: White 10, Yellow Tip 9, Yellow 8, Green Tip 7, Green 6, Blue Tip 5, Blue 4, Red Tip 3, Red 2, Black Tip 1, Poom/Dan to Poom/Dan. Foundation 1, 2 and 3 are non-geup and cannot enter the competition; seminars still apply where eligible.
   - Seminar belt rules use the same grade scale: Green = Geup 6, Red = Geup 2, Black Tip = Geup 1.
4. **Registration form**: name, gender, date of birth, club (invited clubs), grade (or Gaonhae belt), email, mobile (+61), seminars ticked, up to 2 competition events ticked from the eligible list (age division shown automatically), indemnity tick and signature. Seminars and events the participant does not qualify for are greyed out, with the reason shown.
5. **Payment**: live total with the GST included, the Australian bank transfer details (GAONHAE TAEKWONDO, BSB 803-439, account 238 648 651), a payment-proof image upload, then a confirmation screen.

## Gaonhae student price
- A **"I am a Gaonhae student"** tick shows the $40 price.
- On submit, the system checks the name and date of birth against active students. A match keeps $40. If there is no match, the $45 price applies and the parent sees a note explaining why.

## Staff registration log (separate from /access)
- A small, discreet lock icon in the page footer opens a password prompt. The password is the Hp97533488 one.
- After unlocking, staff see the log **split into separate sections — one per seminar** (Poomsae Seminar 1, Kyorugi Seminar 1, Poomsae Seminar 2, Kyorugi Seminar 2) **plus a Competition section**. Each section lists only that activity's participants: name, age, gender, grade/belt, club, contact, amount, Gaonhae-student price yes/no, submitted date, and a payment-proof link. Each section shows its own total against its cap (60 per seminar, 100 for the competition). A participant in several activities appears in each relevant section.
- A **Download PDF** button saves the log as a PDF file, with the same per-seminar and competition sections.
- Nothing appears in the /access tabs, and no automatic invoices are created.

## Technical details
- Add a new page component and the `/perthcomp` route. Reuse `ProofOfPaymentUpload`, `PaymentInfoDisplay` and `SignaturePad`, plus jsPDF for the log PDF.
- One migration will:
  - Add a new table `perth_event_registrations` with grants for the service role only. No browser can read or write it directly.
  - Add `submit_perth_event_registration(jsonb)` (SECURITY DEFINER). The server sets the price ($40 only for an active student matched by name + DOB within one day, otherwise $45). It enforces eligibility, the 10 Nov deadline, the cap of 100 for the competition and 60 per seminar (under a lock, so two people cannot take the last place), and duplicate protection through a stable client reference.
  - Add `get_perth_event_availability()`, which returns only the places left.
  - Add `get_perth_event_log(p_password)`, which checks the password on the server against a stored hash and only then returns the rows. The password is never stored in the page code.
- Proofs upload to the existing private payment-proofs storage. The log shows them through short-lived signed links.
- The server repeats every rule check (grade events, 2-event limit, age by birth year) and does not trust the browser.
