# Grading Settings button: scorecard controls per branch

## What you'll see
- A new **Settings** button in /access → Grading, just before **Events**. Only a superadmin or someone using the all-branch password (Hp97533488) can see it.
- It opens a dialog with one row for each branch, each with:
  - **Print scorecard on back of certificate** (on/off)
  - **Hide height, weight and BMI** (on/off)
  - **Custom fields** — add or remove extra score boxes (e.g. "Flexibility")
- The checkboxes and custom-field boxes above each grading group are removed. Staff still see and fill in the score boxes. Which boxes appear for each student now follows their branch's settings.
- Each branch starts with what it uses today: scorecard on, height/weight/BMI shown, and any custom fields already added to its gradings carried over.

## How it applies
- The branch is the student's branch shown on their grading row, so one grading date with several branches shows each student their own branch's fields.
- Certificates print the scorecard on the back only for branches where it's switched on. Blank scores are still skipped.
- Scores already entered are kept. Removing a custom field hides its box but doesn't delete scores already saved.

## Technical details
- New table `grading_branch_score_settings` (branch_id PK, print_scorecard, hide_body_metrics, extra_fields text[], updated_at/by), with grants and RLS. It is read via a public read function; writes go through `access_grading_branch_score_settings_set(p_password, …)`, gated by `_settings_guard(..., require_all => true)` or superadmin.
- Copy each branch's existing slot settings into the new table: custom fields are combined across that branch's gradings, and the scorecard stays on.
- New `GradingScoreSettingsDialog.tsx`. `PublicGradingList.tsx` looks up settings by `r.branch_id` instead of `slot_id` for score boxes, certificate printing and Grading Summary. `SlotScoreSettingsBar` is removed from the list.
- `grading_slot_score_settings` stays in place, unused. Add an AGENTS.md rule for this.
- Check in the browser: the button shows with Hp97533488 but not with a branch password; switching the scorecard off for a branch stops it printing on that branch's certificates; a custom field shows only for that branch's students.
