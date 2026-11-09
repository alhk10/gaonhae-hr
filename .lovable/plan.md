# Dan to Dan steps become gradings

## What changes
- Only Poom to 1st Dan (STF 1st–4th Poom > 1st Dan) stays an administrative conversion.
- 1st > 2nd, 2nd > 3rd and 3rd > 4th Dan become gradings. They are billed with the normal grading products (for example, the existing "1st Dan >> 2nd Dan" grading product). The belt updates through grading results, as with other gradings.
- The age and wait rules still apply to Dan gradings:
  - 2nd Dan: from the 16th birthday, 1 year after 1st Dan
  - 3rd Dan: from the 18th birthday, 2 years after 2nd Dan
  - 4th Dan: from the 21st birthday, 3 years after 3rd Dan

  Grading invoices and registrations warn about, or block, students who are not yet eligible.
- The three "STF 1st Dan > 2nd Dan", "STF 2nd Dan > 3rd Dan" and "STF 3rd Dan > 4th Dan" conversion products are switched off. Past invoices keep them.
- The "Conversion due" badge in Attendance and the student profile only shows for Poom holders aged 15 or older.
- When a Dan grading result is recorded, the student's last Dan date is set to the grading date, so the next wait period counts from it.

## Technical details
- `src/utils/danConversion.ts`:
  - `nextConversionTarget` returns 1st Dan only for Poom ranks.
  - Add `checkDanGradingEligibility` using the existing `DAN_STEPS`.
  - Update the tests.
- Database:
  - `_dan_conversion_check` allows only Poom > 1st Dan conversion lines.
  - Add a Dan grading eligibility check on invoice lines for Dan >> Dan grading products.
  - Deactivate the three STF Dan > Dan products.
  - A grading-result trigger sets `last_dan_conversion_at` when the belt becomes 2nd, 3rd or 4th Dan.
- Update `ConversionDialog`, `AttendanceTab`, `StudentProfileDialog` and `beltLevels` to use the new rules.
