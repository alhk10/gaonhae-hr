# Perth /perthcomp: downloadable registration confirmation

## What changes
After a successful registration on /perthcomp, the confirmation screen gains a **Download Confirmation (PDF)** button. The parent can save a PDF receipt of the registration straight away.

## The confirmation PDF contains
- Gaonhae Taekwondo Perth Seminars & Poomsae Championship 2026 header, logo, dates and venue (Scarborough Community Centre 2, Function Room).
- Registration reference number and submitted date.
- Registrant details: name, club, grade/belt, email, mobile.
- What they registered for: each seminar ticked (with its time) and each competition event (age division, gender, poomsae).
- Amount paid per item and the total (GST included), plus whether the Gaonhae student price applied.
- A note that payment is pending staff verification.

## Technical details
- Only `src/pages/public/PublicPerthComp.tsx` changes; no database changes.
- The PDF is generated in the browser with jsPDF (already used for the staff log PDF) from the data returned by `submit_perth_event_registration` plus the form values — no extra server call.
- File name: `perth-2026-confirmation-<reference>.pdf`.
- The button uses a direct click-to-download (no async work before the click) so it works on phones.
