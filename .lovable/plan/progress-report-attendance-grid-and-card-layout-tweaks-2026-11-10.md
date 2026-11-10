# Progress report: attendance grid and card layout tweaks

## Summary page (page 1)
- Progress Card column: show only the saved date (DD/MM/YYYY), or "-" when not done (drop "Done"/"Not done").

## Attendance page (page 2)
- Replace Attended/Absent/Booked/Total columns with one column per term class date (DD/MM, rotated or compact header).
- Each cell: **P** = Present (attended), **A** = Absent, blank = no booking/not marked.
- Keep a final total column (P count) per student.
- Font and column width shrink automatically to fit all term dates on an A4 page (switch page to landscape if more than ~25 dates).
- Legend at the bottom: "P = Present · A = Absent · blank = not booked".

## Individual progress card
- Header: logo on the left, title "PROGRESS REPORT CARD" + tagline centred on the page, kicking caricature on the right.
- Logo 15% bigger; kicking caricature 10% bigger.
- "READY FOR GRADING TEST?" box: title and Yes/No checkboxes centred within the box.
- Thumbs-up caricature resized to sit fully beside the box without overlapping.
- Remove the bowing ("attention") caricature at the bottom.

## Technical details
- Migration: extend `access_progress_report` attendance JSON with `dates` (distinct term lesson dates for the branch from `lesson_bookings`, excluding public holidays) and per-student `marks` map `{date: 'attended'|'absent'}`; keep existing counts.
- Update `ProgressReportRow` type in `progressCardService.ts`.
- `progressCardPdf.ts`: rebuild attendance page as a dynamic grid; adjust summary cell text; card header/readiness/art positions. Visually check a sample PDF.
