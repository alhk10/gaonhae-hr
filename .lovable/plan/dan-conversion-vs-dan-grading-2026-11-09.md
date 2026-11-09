# Dan conversion vs Dan grading

## Rule
A student can convert to a higher Dan only if they held a Poom rank at least as high before converting. If not, they must take a grading.

| Target | Conversion allowed when | Otherwise |
|---|---|---|
| 1st Dan | 15th birthday, any Poom (1st–4th) | n/a |
| 2nd Dan | 16th birthday, holds 1st Dan, 1 year since 1st Dan, previously held 2nd Poom or higher | Grading |
| 3rd Dan | 18th birthday, holds 2nd Dan, 2 years, previously held 3rd Poom or higher | Grading |
| 4th Dan | 21st birthday, holds 3rd Dan, 3 years, previously held 4th Poom | Grading |

Example: a 1st Dan student who was 4th Poom can convert to 2nd, 3rd and 4th Dan as each age and wait period is reached. A 1st Dan student who was 1st Poom, or never held Poom, must grade for 2nd Dan and above.

## What changes
- The "Conversion due" badge and the conversion dialog only offer a Dan > Dan conversion when the earlier Poom rank allows it. Otherwise the student is treated as a normal grading (for example, the "1st Dan >> 2nd Dan" grading product).
- Invoices refuse an STF Dan > Dan conversion line if the student's earlier Poom rank is too low, and show the reason.
- The STF Dan > Dan conversion products stay active, for students who qualify.
- When a Dan grading result is recorded, the student's last Dan date updates, so wait periods still count correctly.
- Students with no recorded earlier Poom rank are treated as grading-only. Staff can set the earlier Poom rank on the student's profile.

## Technical details
- In `src/utils/danConversion.ts`, `checkConversionEligibility` gets a `prePoom` argument. Dan steps require the Poom number to be at least the target Dan number. Update the tests.
- `_dan_conversion_check` checks the student's stored pre-conversion Poom rank in the same way.
- `AttendanceTab`, `StudentProfileDialog` and `ConversionDialog` pass the earlier Poom rank.
- A grading-result trigger sets `last_dan_conversion_at` when the belt is promoted to 2nd, 3rd or 4th Dan.
