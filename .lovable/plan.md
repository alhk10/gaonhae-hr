# Progress report summary fixes

## What changes
1. **Progress Card column** — Make sure it appears between Birth Date and Ready for Grading Test. Show "Done dd/mm/yyyy" or "Not done". Narrow the columns so everything fits on A4 (in your screenshot the table is cut off).
2. **Attendance page (page 2)** — Add a new page after the summary. It shows each active student's attendance for the selected term: Attended, Absent, Booked and the total number of lessons. Students are listed in the same order as on the summary.
3. **Paid date** — Show the paid date only for a grading payment in the selected term, not for payments from earlier terms or for school fees.
4. **Individual cards** — Only add card pages for students whose card has been saved. Never add empty card templates.

## Technical
- Update `access_progress_report`: work out the paid date from grading registrations or payments linked to the selected term's grading slots, using the existing year/term or event-date term rule. Also return attendance counts from `lesson_bookings` within the term's start and end dates, grouped by status.
- `progressCardPdf.ts`: set new column widths to fit 182mm, add the attendance table page, and skip card pages where `card_id` is null.
- Check by generating a sample PDF.
