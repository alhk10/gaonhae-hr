# Simplify Seminars tab on /grading-list

Remove the **Collected** and **Match / Invoice** columns from the Seminars tab. Student matching, invoice creation, and collection tracking will live exclusively in the Superadmin dashboard's Seminars management (to be wired separately).

## Changes — `src/components/grading-list/SeminarsTab.tsx`

- Drop the `<TableHead>Match / Invoice</TableHead>` and `<TableHead>Collected</TableHead>` headers.
- Drop the corresponding `<TableCell>` cells: the "Find match" button + matched-student/invoice display, and the Collected checkbox.
- Remove now-unused state, handlers, and imports: `matchDialog`, `findMatches`, `adminMatchSeminarSubmission`, `adminCreateSeminarInvoice`, `adminMarkSeminarCollected`, related toasts, and the Search/Checkbox icons if unused elsewhere in the file.
- Keep: DOB, Branch, Belt, Package, Amount, Proof, Sale Status, Actions (verify/reject/delete remain gated by the existing passwords).

## Out of scope

- No DB or RPC removals — `admin_match_seminar_submission`, `admin_create_seminar_invoice`, `admin_mark_seminar_collected` stay so the Superadmin dashboard can use them later.
- No changes to the public `/seminars` page, Competitions/Guards/Grading tabs, or password gating.
