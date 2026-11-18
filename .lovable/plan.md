# /perthcomp: competition only, renamed

## What families will see
1. The title becomes **Gaonhae & Friends Competition 2026** on the page heading, the browser tab, the confirmation PDF, the staff log PDFs and the Registered Competitors PDF. That PDF currently says "2026 Gaonhae & Friends Competition", so it changes to match.
2. The date under the title changes from "28 to 29 November 2026" to **Sunday 29 November 2026**.
3. The two seminar posters and the "Saturday 28 Nov — Seminars" card are removed.
4. The registration form loses its seminar checkboxes, so only competition events can be picked. The waiver text drops "seminars and".
5. The competition rules, prices, cap, closing date and payment stay the same.

## Kept for staff
6 people have already registered for seminars. Their records and the staff log's Seminars tab stay, so staff can still see and contact them. New sign-ups can't pick seminars.

## Technical
- `src/pages/public/PublicPerthComp.tsx`: remove poster imports and grid, the seminars card, and the form's seminar section; validation message becomes "Select at least one competition event"; submit sends `seminars: []`; update `document.title`, the header and the PDF titles (lines ~161, 246, 550).
- The confirmation PDF's seminar loop is harmless because the list is empty; leave it.
- Update the Perth Comp memory note with the new name.
