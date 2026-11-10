# Show amount with paid date in the progress report summary

## What changes
- The "Paid Date" column becomes "Paid Date / Amount" and shows the date paid with the grading amount below it, for example "29/10/2026" then "S$85.00".
- The amount only counts payments for the current term's grading, using the same rule as the paid date.
- The date and amount only show once the grading invoice is paid and the payment is verified. Pending or rejected payments are left out.
- Students who haven't paid still show "—".
- Amounts use the branch's currency (S$ or A$).

## Technical
- `access_progress_report`: add `paid_amount`, the sum of verified payments only (`verification_status = 'verified'`), with `paid_date` limited to those same verified payments, on the invoice line for the term's grading. Also return the branch country.
- `ProgressReportRow`: add `paid_amount`.
- `progressCardPdf.ts`: render a two-line date/amount cell with the existing currency formatter, and adjust column widths to keep the table at 182mm.
