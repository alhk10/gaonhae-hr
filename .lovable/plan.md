Update `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx` to mirror the grading submissions card (`PublicGradingSubmissionApprovals.tsx`). All required RPCs and service functions already exist on the competition service — this is a UI rewrite of one component, no backend changes.

## Changes to PublicCompetitionSubmissionApprovals.tsx

1. **Row layout** — match grading card:
   - Show Matched / Unmatched + Pending / Verified status badges.
   - Show branch, amount, payment method, submission timestamp, categories.

2. **Action buttons per row** (replace single "Match & Approve"):
   - `Match Student` / `Re-match` → opens match dialog (does match only, no import).
   - `Verify & Import` → calls `importCompetitionSubmission`; disabled until `matched_student_id` is set. This creates the invoice.
   - `Edit details` → opens edit dialog using `updateCompetitionSubmissionDetails` (first/last name, email, DOB, belt, branch).
   - `Reject` → existing reject flow.

3. **Match dialog** — mirror grading:
   - Suggested matches from `findCompetitionSubmissionStudentMatches`.
   - Manual search via `students` table.
   - "Create new student" inline form (first/last name, DOB, email, branch, gender, belt), prefilled from submission, calls `createStudent` then `matchCompetitionSubmission`.
   - Match buttons call `matchCompetitionSubmission` only (no auto-import), so reviewer can verify before generating the invoice.

4. **Edit dialog** — first name, last name, email, DOB, belt, branch; saves via `updateCompetitionSubmissionDetails`.

5. **Reject dialog** — unchanged.

6. Keep certificate + proof thumbnail previews.

## Out of scope
- No database / RPC / service changes.
- No changes to `/comps` public submission page or grading list Competitions tab.
