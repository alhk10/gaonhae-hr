# Print grading scorecards on certificates for every Australian branch

## What I found
- The certificate only adds the scorecard back page for Morley students. Floreat (Leo Hong) and Yokine (Kangjun Cho, Arien Web, Ayden Webb) are skipped.
- Scores for these four are not saved. Morley has scores for 39 of its 41 students at the 19/09/2026 grading. Floreat and Yokine have none. Until today the score boxes only saved for Morley, so scores typed in for other branches were turned away.
- As you asked, blank scorecards are skipped: a back page prints only when scores are saved.

## Fix
- Add the scorecard back page and the Pass/Double/Fail result to certificates for every branch, not only Morley, whenever scores are saved.
- Staff re-enter the scores for Leo, Kangjun, Arien and Ayden in the Grading list. The score boxes now save for every branch. Then they download the certificates again.

## Check
- Enter test scores on one Yokine student, download the certificate, confirm page 2 shows the scorecard, then remove the test scores.

## Technical details
- `PublicGradingList.tsx` `rowToCertInput`: drop the `isMorleyRow` gate for `scorecard` and `result`. Apply the same change to any other certificate builders (BranchGradingList / GradingListTab) found with `rg "scorecard:"`.
