## Goal

On /seminars, let a participant select multiple packages of the same event, and apply an automatic multi-package discount ($10 for 2, $20 for 3, $30 for 4, +$10 per extra), enabled per event.

## Database

- Add `multi_package_discount boolean not null default false` to `seminar_events`; expose and accept it in `get_public_seminar_events` and `admin_upsert_seminar_event`.
- Add `discount_amount numeric not null default 0` to `seminar_payment_submissions`; include it in `get_public_seminar_list` and accept it in `submit_seminar_payment`.
- Multiple selected packages are stored on one submission row: `package_code` = codes joined with `,`, `package_label` = labels joined with ` + `, `session_dates` = merged unique sorted dates, `amount` = discounted total.

## Discount rule

`discount = max(0, (numberOfSelectedPackages - 1) * 10)` — 1 → $0, 2 → $10, 3 → $20, 4 → $30, 5 → $40, and so on. Applied only when the event has the toggle on, and never below $0 total. GST is computed on the discounted total (unchanged inclusive-GST math).

## Frontend

- `SeminarEventsSettingsDialog.tsx`: add an "Allow multi-package selection with discount" switch, saved via the upsert helper.
- `PublicSeminarPayment.tsx`: replace the radio group with checkboxes when the event has the toggle on (radio kept for other events). Show a summary line per selected package, a "Multi-package discount −$X" row, then subtotal/GST/total.
- `seminarPaymentSubmissionService.ts`: change submit input to accept a list of packages plus `discount_amount`; build the joined code/label/dates and the discounted amount; email uses the joined label and the final amount.
- `SeminarsTab.tsx` / `EditSeminarSubmissionDialog.tsx`: display the joined package label as-is; the edit dialog's package selector allows multiple selections for multi-package events and recalculates the amount and discount the same way.

## Technical notes

- All discount math lives in one shared helper (`seminarDiscount(count)`) used by the public page and the edit dialog so the two never drift.
- Existing single-package submissions keep working: `discount_amount` defaults to 0 and single-code values parse fine as a one-item list.
