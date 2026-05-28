Three changes, all in the Seminars tab on `/grading-list` (`src/components/grading-list/SeminarsTab.tsx`). The Competitions tab already has inline Accept/Reject (added in the previous turn at `PublicGradingList.tsx` lines 2063–2085) — no changes needed there beyond a sanity check.

## 1. Reorder columns + thumbnail proof (Seminars tab)

Reorder columns to mirror the Grading list / Competitions tab compact style:

```text
Branch | Student | Belt | Package | Status | Amount | Proof | Actions
```

- Drop the separate "Submitted" and "DOB" columns from the table (still kept in the data row, just not shown — DOB is still available in the match dialog if needed).
- Use the same compact row sizing as Competitions tab: `h-7 px-2 text-[11px]` headers, `text-xs px-2 py-1` cells.
- Replace the "View" text link in the Proof column with a 40×40 image thumbnail (`SignedImage`, `h-10 w-10 object-cover rounded border`) that opens a rotate-capable preview dialog (same `Thumb` + preview dialog pattern used in the Competitions tab).

## 2. Inline Accept + Reject in Seminars tab (mirror /pay grading flow)

For rows where `paid_status === 'pending'`:

- **Accept** (green `CheckCircle`) opens a "Match student & verify" dialog. Behavior mirrors the Competitions tab match dialog:
  - Fetches suggested matches via `findSeminarSubmissionStudentMatches(submission_id)`.
  - Manual search box queries `students` (name / email / student_number, `ilike`, limit 20).
  - "Use" button on a row calls `matchSeminarSubmission(id, studentId)` → `createSeminarInvoice(id, verifiedBy)` → toast, invalidate `public-seminar-list`.
  - If the seminar service requires `importSeminarSubmissionStudent` first when there is no matched student (creating a new student record), expose a secondary "Create new student from submission" action in the dialog that calls `importSeminarSubmissionStudent(id, verifiedBy)` then `createSeminarInvoice`. The RPC already exists in `seminarPaymentSubmissionService`.
- **Reject** (red `XCircle`) — already present, kept as-is.

`verifiedBy` continues to come from `useAuth()` (`employeeId / email / 'system'`).

## 3. Competitions tab sanity check

The previous turn added inline Accept (`CheckCircle`) and Reject (`XCircle`) for `paid_status === 'pending verification'` in `PublicGradingList.tsx` `CompetitionsTab`. No additional changes — just verify the buttons render for rows with that status.

## Out of scope

- No new RPCs, services, or DB migrations — `findSeminarSubmissionStudentMatches`, `matchSeminarSubmission`, `importSeminarSubmissionStudent`, `createSeminarInvoice`, `rejectSeminarSubmission` already exist in `src/services/seminarPaymentSubmissionService.ts`.
- No new dashboard approvals card for seminars.
- No changes to the public `/seminars` submission page itself.

## Files touched

- `src/components/grading-list/SeminarsTab.tsx` — column reorder, thumbnail + preview dialog, inline Accept dialog with match/search/verify.
