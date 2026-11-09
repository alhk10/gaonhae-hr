# Concise student list in /access Students

## What changes
Each student takes one compact row (two lines when the screen is narrow), the same style as the Attendance list:

```text
ELLIE XU  Yellow Tip · Little Gaonhae · Morley   [Unpaid S$214 due] [ ] Ready for grading   ✎ +
  STU260225 · DOB 04/08/2022 · dsykina@hotmail.com · +61 403556237 · Term 4 2026 · Credit S$20
```

- **Line 1:** name, belt, class group and branch. The status badge appears only when the student isn't active (trial, inactive or withdrawn). Then the term badge, the grading badge and the edit/invoice icons.
- **Line 2 (small grey):** student number, date of birth, email, phone, the enrolment term, and credit if there is any.
- **Term badge:** **Paid** (green, also covers paid-and-verified and pending verification), **Unpaid** (red, with the amount due; covers draft, unpaid, partially paid and overdue), or **No invoice** (grey). Trial students show **Trial** instead.
- **Grading badge:** a **Ready for grading** tick box that staff can click (same as Attendance), or **Grading paid** once paid. It uses the same corrected current-term rule, so last term's gradings don't show.
- The column headings and the separate Belt, Branch, Status, Contact, Enrolment, Term payment and Credit columns are removed.
- Filters, search, sorting, the employee toggle, clickable names and the edit/invoice buttons stay as they are.

## Technical details
- Extend `get_public_student_directory` to also return `term_id` and `grading` (`_grading_ready_state(student, term_id)`) for each row. Add both fields to `PublicStudentDirectoryRow`.
- In `StudentsTab.tsx`, replace the desktop table and the mobile cards with one flex-wrap row list. Add a `termBadge(invoice_status)` helper that maps to paid/unpaid/none. The tick box calls the existing `access_set_ready_for_grading` RPC (from `lessonBookingService`), then refreshes the directory query.
