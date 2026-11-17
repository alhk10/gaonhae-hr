# Grading list: result overrides, custom score fields, hide body measurements

## 1. Superadmin / Hp97533488 can set any result
- In the /access Grading list (edit mode), superadmin and the all-branch password Hp97533488 can set Pass / Double / Fail / Confirmed on every row, even when term fees or the grading fee are unpaid or there is no invoice (e.g. LEO HONG, "T3 no invoice").
- Also lifts the 30-day result window for them, and lets them issue certificates for those rows.
- Each override on an unpaid row is written to the existing grading override log, so it stays reviewable.
- Branch passwords keep today's rules.
- First step: confirm exactly why LEO HONG's result box is greyed out (date window vs. missing grading record), then remove that block for these two roles only.

## 2. Custom score fields
- A "Score fields" button above each grading slot lets staff add, rename, reorder or remove fields (e.g. "Flexibility", "Board break") on top of the defaults.
- Fields are saved per branch and term, so every student in that grading shows the same boxes.
- Custom fields appear on the inline score row, the scorecard dialog and the Grading Summary download.
- Custom fields do not affect the automatic Pass/Double/Fail score (still Poomsae, Balchagi, Kyorugi, Hoshinsul).

## 3. "Hide height, weight and BMI" tick box
- One tick box next to Score fields. When ticked, Height, Weight and BMI disappear from the rows, the Grading Summary and certificates for that branch and term. Values already entered are kept.

## Technical details
- Reuse `grading_term_scorecard_columns` (per term + branch) via `gradingScorecardColumnService`; drive `PublicScorecardInline` from those columns instead of `DEFAULT_SCORECARD_LABELS`, and show it for all branches, not only Morley.
- Add a `hide_body_metrics` boolean per term + branch (new small settings row/column) behind a password-gated SECURITY DEFINER RPC using `_settings_guard`.
- Result RPCs (`admin_update_grading_result`, `admin_update_grading_submission_result`) accept an override flag allowed only for `is_superadmin` or `_access_require_all`; frontend passes `isAllBranch || isSuperadmin` to skip the window/payment disable and the certificate eligibility payment check; log to `grading_override_log`.
