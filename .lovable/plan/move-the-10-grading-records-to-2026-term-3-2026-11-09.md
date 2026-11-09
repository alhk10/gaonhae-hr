# Move the 10 grading records to 2026 Term 3

- Move the 10 Carpe Diem grading registrations for the 08/10/2026 grading (tagged 2026 Term 3) from "2026 Term 4" to the new "2026 Term 3" calendar.
- Invoices, payments and results stay unchanged.
- Afterwards, these students appear in the Term 3 grading list as paid and no longer appear in the Term 4 list. In Attendance and Students, they show the unticked **Ready for grading** box for Term 4.

## Technical details
Update `grading_registrations` to set `term_id` to `6a9fccb2-…` (2026 Term 3) where `term_id` is `2bc2b021-…` (2026 Term 4) and the slot's `grading_year = 2026` and `grading_term = 3`. Then check the count is 10.
