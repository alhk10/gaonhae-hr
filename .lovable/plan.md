# Casual payslip: hide $0 dates and stop footer overlap

Applies to the casual staff payslip PDF.

## 1. Hide zero-value dates
- Leave timesheet rows with $0.00 pay and 0 hours off the payslip (for example 23/09 and 25/09 in the screenshot).
- Totals stay the same, since those rows add nothing.
- If every row is zero, show one line: "No paid sessions this month".

## 2. Footer never overlaps content
- Before drawing the section below the timesheet (day rate, earnings, deductions, net pay, CPF summary), measure how tall it will be.
- If it fits above the footer line, draw it as usual.
- If it overflows by less than 3 lines (about 12mm), squeeze the gaps between sections a little so it fits on the current page.
- If it overflows by more, move whole sections to the next page. Sections never split, and the next page starts at the top margin.
- Draw the footer ("This payslip is computer generated...") last, at the bottom of every page, below a reserved margin. Content always stops above that margin. Also apply the same margin to timesheet row page breaks.

## Technical details
- File: `src/utils/casualPayslipPDFGenerator.ts`.
- Filter `data.slots` with `pay > 0 || hoursWorked > 0` before rendering.
- Add a `FOOTER_LIMIT` of about 278mm, an `ensureSpace(height)` helper that calls `addPage` when needed, and a `gap` multiplier (1.0, or as low as about 0.6 when the overflow is under 12mm) on the spacing between sections.
- Loop over `doc.getNumberOfPages()` at the end to stamp the footer on every page.
- QA: render a payslip that matches the screenshot data to images and check that nothing overlaps.
