Add inline Accept and Reject controls to the Competitions tab table in `src/pages/public/PublicGradingList.tsx` (the `CompetitionsTab` component, ~line 1870). Only the table UI changes — backend RPCs (`matchCompetitionSubmission`, `importCompetitionSubmission`, `rejectCompetitionSubmission`, `findCompetitionSubmissionStudentMatches`) already exist.

## Changes

1. **New "Actions" column** in the table header (rightmost, before the existing delete column).

2. **Per row**, when `paid_status === 'pending verification'` (i.e. not yet imported as a paid invoice):
   - **Accept** icon button (green CheckCircle): opens a compact "Match & Verify" dialog that fetches `findCompetitionSubmissionStudentMatches(submission_id)` plus a manual student search (same pattern as `PublicCompetitionSubmissionApprovals`). Selecting a student calls `matchCompetitionSubmission` then `importCompetitionSubmission` and invalidates `public-competition-list`.
   - **Reject** icon button (red XCircle): opens a small dialog with an optional reason textarea, calls `rejectCompetitionSubmission(id, reason, verifiedBy)`, invalidates the list.

3. Rows that are already paid/verified show no Accept/Reject (just the optional delete control).

4. Wire `verifiedBy` from `useAuth()` (employeeId / email / 'system'), matching the approvals component.

## Out of scope
- No changes to the Approvals card on the dashboard.
- No new service functions, RPCs, or DB migrations.
- No edit-details flow inline (still available on the dashboard approvals card).
