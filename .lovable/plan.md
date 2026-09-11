# Fix birth dates using GMT+8

## Confirmed findings

- QIYU YE’s student account was created on **29/06/2026 at 20:56 GMT+8** with DOB **21/06/2020**.
- Her earlier grading submission also records **21/06/2020**.
- The new unmatched grading submission was saved on **11/09/2026 at 08:21 GMT+8** with DOB **22/06/2020**.
- Public payment forms now save date-only values safely, but several remaining parts of the app still turn `YYYY-MM-DD` birth dates into timezone-sensitive JavaScript dates.

## Changes

1. **Use one shared birth-date implementation**
   - Create shared helpers for parsing, validating, formatting, and calculating age from date-only birth dates.
   - Treat DOB values as calendar dates in **GMT+8**, never as UTC timestamps.
   - Replace duplicated DOB picker logic across grading, competitions, events, school fees, uniforms, and guards with the same shared control.

2. **Remove remaining one-day conversion risks**
   - Replace remaining direct `new Date('YYYY-MM-DD')` handling in student details, dashboards, belt defaults, class eligibility, quick actions, and approval validation.
   - Keep stored DOB values as `YYYY-MM-DD` strings and display them as `DD/MM/YYYY`.
   - Extend the existing lint safeguard to reject timezone-sensitive parsing of date-only strings.

3. **Correct the confirmed Qiyu record**
   - Change only the new unmatched QIYU YE grading submission from **22/06/2020** to **21/06/2020**, matching both her established student account and prior grading record.
   - Do not change her student account DOB.

4. **Protect matching and future submissions**
   - Ensure grading, competition, event, school-fee, uniform, and guard matching compares normalized date-only values.
   - Show a clear DOB mismatch when a submission differs from an otherwise likely student match instead of silently changing either record.

5. **Verify end to end**
   - Test representative dates in GMT+8 across all public forms and approval dialogs.
   - Re-audit matched transactions for one-day DOB differences after the correction.
   - Confirm type-check and preview build pass.

## Technical details

- Date-only values will remain PostgreSQL `date` / `YYYY-MM-DD`, with no midnight timestamp conversion.
- Timestamp displays used for auditing will be explicitly converted to `Asia/Singapore` (UTC+8).
- Existing unrelated historical records will not be modified automatically.
