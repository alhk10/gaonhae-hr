# Scorecard page on certificates for every branch

## What changes
- Every branch's certificates get the scorecard back page, not only Morley's. This covers Floreat (Leo Hong) and Yokine (Kangjun Cho, Arien Web, Ayden Webb).
- Each grading's settings bar in the /access Grading list (edit mode) gets a new "Print scorecard on certificate" switch. It is on by default, and when it's off certificates have only the front page.
- That settings bar is also where staff choose the score fields: add custom fields and tick "Hide height, weight and BMI". The scorecard page shows exactly those fields.
- Blank scores are left off the page. If a student has no scores saved at all, no back page is printed.
- No scores are saved yet for these four students, so staff need to type them into the Grading list before printing.

## Check
- Enter test scores on one Yokine student, then download the certificate and confirm page 2 shows only the filled fields.
- Turn the switch off and confirm the certificate is one page.
- Remove the test scores and turn the switch back on.

## Technical details
- Add `print_scorecard boolean default true` to `grading_slot_score_settings`. Extend `access_grading_slot_score_settings_set` with `p_print_scorecard`, keeping its existing behaviour, and add the checkbox to `SlotScoreSettingsBar`.
- `rowToCertInput` in `PublicGradingList.tsx`: remove the `isMorleyRow` gate. Pass the scorecard only when `print_scorecard` is on, filtered to non-blank rows, in slot field order (defaults minus Height/Weight when hidden, then extras), and drop BMI when hidden. Apply the same change to the bulk certificate path.
