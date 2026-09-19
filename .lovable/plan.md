# Add a Students tab to /access

Add a **Students** tab to the public `/access` page (PublicGradingList), alongside Summary, School Fees, Grading, Competitions, Seminars, Uniforms & Guards, and AI Poster Maker.

## What users see

- A new "Students" tab (tab bar widened to 8 columns on desktop, wrapping on mobile).
- Searchable directory of all students with:
  - Name, current belt, branch, status (active/inactive/withdrawn/trial)
  - Contact info (email, phone)
  - Current term enrolment: term name, class/package, lessons per week
  - Payment status for the current term invoice (paid / partially paid / unpaid, amount due)
  - Available credit balance
- Filters: search box (name/email), branch dropdown, status dropdown.
- Dates shown as DD/MM/YYYY via `@/utils/dateFormat`; names uppercase, statuses lowercase per project conventions.

## Visibility & editing

- **Public read**: the tab loads without login, consistent with the other /access tabs.
- **Locked edits**: editing is enabled only after unlocking with the existing admin password (same lock icon / session unlock used by the other tabs).
- When unlocked, each row gets an Edit (pencil) action opening a dialog to update: belt, branch, and status. Status changes to "withdrawn" are not offered here (that stays behind the superadmin approval workflow).

## Technical details

- New component `src/components/grading-list/StudentsTab.tsx` (same folder pattern as SeminarsTab/SchoolFeesTab), rendered inside `PublicGradingList.tsx` with `editMode` passed in.
- New service functions in `src/services/studentDirectoryService.ts` calling two new SECURITY DEFINER RPCs (the students/invoices tables are RLS-protected, so direct public reads are not possible — this matches the existing get_public_grading_list pattern):
  - `get_public_student_directory(search, branch_id, status)` — returns student rows joined with current-term enrolment, current-term invoice payment status, and credit balance; capped (e.g. 200 rows) with a result-count hint.
  - `admin_update_student_basic(student_id, belt, branch_id, status)` — validates status against the allowed set ('active', 'inactive', 'trial' — no 'withdrawn'), uppercases nothing except keeping name conventions, logs the change to `student_change_logs`.
- Both RPCs granted to `anon` and `authenticated`, `SET search_path = public`.
- The edit RPC updates only belt/branch/status; enrolment and payment data remain view-only on this tab (invoice edits stay in the dashboards).

## Steps

1. Migration: create the two RPCs with grants.
2. Add `studentDirectoryService.ts` client wrappers.
3. Build `StudentsTab.tsx` (search/filter UI, mobile-friendly two-line rows like the Competitions tab, edit dialog gated on unlock).
4. Wire the tab into `PublicGradingList.tsx` (new TabsTrigger + TabsContent; widen grid to 8).
5. Typecheck/build; verify tab renders and edit unlock flow works.
