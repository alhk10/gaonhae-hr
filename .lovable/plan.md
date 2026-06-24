## Add "Age" column before Belt in Competitions list

Show the student's age (current year − birth year) in the Competitions tab on `/grading-list`, between **Student** and **Belt**, sourced from the DOB captured at submission time (`competition_payment_submissions.date_of_birth`).

### Changes

**1. Database — RPC `get_public_competition_list`**
Add `date_of_birth date` to the returned TABLE signature and select `cps.date_of_birth` from `competition_payment_submissions`. No table/column changes (DOB already stored).

**2. Service — `src/services/competitionPaymentSubmissionService.ts`**
Add `date_of_birth: string | null` to `PublicCompetitionListRow`.

**3. UI — `src/pages/public/PublicGradingList.tsx` (Competitions table)**
- Add `<TableHead>Age</TableHead>` between the **Student** and **Belt** headers.
- Add the matching `<TableCell>` rendering `currentYear − birthYear` (e.g. `2026 − 2014 = 12`), or `—` when DOB is missing/invalid. Uses a small helper computed inline:
  ```
  const ageByYear = r.date_of_birth
    ? new Date().getFullYear() - new Date(r.date_of_birth).getFullYear()
    : null;
  ```
- text/styling matches the adjacent Belt cell (`text-xs px-2 py-1`).

### Out of scope
- Print PDF (`competitionPrintPDFGenerator.ts`) — not requested; leave columns unchanged.
- Edit dialog and public submission form — DOB already captured/edited there.
- Grading and Seminars tabs.
