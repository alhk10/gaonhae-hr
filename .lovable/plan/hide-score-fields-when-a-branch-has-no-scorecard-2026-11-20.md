# Hide score fields when a branch has no scorecard

## What changes
- In `/access` → Grading, edit mode shows the score fields (Height, Weight, BMI, Poomsae, Balchagi and custom fields) under each student. A student will see those fields only when their branch has **Print scorecard** turned on in Grading Settings.
- For branches with the scorecard switched off, rows show only the name, badges, invoice and result controls.
- Scores that were already saved are kept. Turning the scorecard back on brings the fields back with their values.

## Technical details
- In `src/pages/public/PublicGradingList.tsx` (around line 2007), render `PublicScorecardInline` only when `editMode` is on and the branch setting's `print_scorecard !== false`. Students without a branch keep the fields.
- Verify in Playwright with all-branch access: switch one branch's scorecard off, confirm its rows have no fields, then switch it back on.
