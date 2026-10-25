# Unpaid term badge in Attendance

## What you'll see
In the Attendance tab, each student row in a timeslot gets a red **Unpaid** badge (next to the existing Trial / Requested badges) when that student has not paid for the term the lesson falls in.

- **Paid** (no badge): the student has a class fee invoice covering that term that is paid or verified.
- **Unpaid** (red badge): a class fee invoice for that term exists but is still unpaid, partially paid, draft, sent or overdue.
- **No invoice** (grey badge): no class fee invoice for that term at all.
- Cancelled and void invoices are ignored. Trial students show their Trial badge only.

## Technical details
- Update `access_attendance_week` so each returned booking includes `term_payment` (`paid` | `unpaid` | `none`), derived from `invoices` + `invoice_items` (class category items whose term matches the booking date's term, same student), excluding cancelled/void.
- Same password protection as today; no new permissions.
- `AttendanceTab.tsx`: render the badge from `b.term_payment` in the student row; add the field to the `LessonBooking` type.
- Add a small test for the paid/unpaid/none rule.
