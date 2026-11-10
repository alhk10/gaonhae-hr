# Remove total "P" column from attendance page

In the progress report summary's Term Attendance Record page (`src/utils/progressCardPdf.ts`):

- Remove the final "P" header column and the per-student present count.
- Give the freed width (9mm) to the date columns (`totW` set to 0, drop the count logic).
- Update the legend to: "P = Present · A = Absent · blank = not booked / not marked" (remove "P column = total present").

Nothing else changes.
