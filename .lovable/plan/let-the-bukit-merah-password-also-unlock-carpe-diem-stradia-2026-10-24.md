## Let the Bukit Merah password also unlock Carpe Diem Stradia

### Result
Staff unlocking `/access` with the Bukit Merah password see Bukit Merah and Carpe Diem Stradia, and no other branch. A small branch switcher (Bukit Merah / Carpe Diem Stradia / Both) replaces the "Bukit Merah only" label. All other passwords stay as they are, and the all-branch password still sees every branch.

### What changes
- **Lists and counts** (Summary, Students, School Fees, Grading, Competitions, Seminars, Uniforms & Guards, Studio Rental, External Invoices): show both branches by default, with the switcher to narrow to one.
- **Creating things** (invoices, external invoices, students): the branch dropdown offers only these two branches.
- **Server checks**: actions protected by the password (invoice creation, edits, deletes, approvals) accept either branch for this password and still reject any other branch.

### Technical details
- Database: change `access_unlock_passwords` so one password can map to several branches (add a row with the same hash and `BR1769014316844`, using a composite key instead of `password_hash` alone). Add `_access_branches(p_password)` returning the allowed branch ids ('*' for all). Keep `_access_scope` working for existing callers, then change its branch checks (`scope = branch`) to `branch = ANY(allowed)` in the functions that use it.
- Frontend: in `PublicGradingList.tsx`, change `BRANCH_UNLOCK_PASSWORDS` so each password maps to an array, and change `lockedBranchId` to `lockedBranchIds` (saved in session as JSON; older single-value sessions still read correctly). Pass the allowed list to the tabs that use `lockedBranch*` (`SummaryTab`, `StudentsTab`, `SchoolFeesTab`, `SeminarsTab`, `StudioRentalTab`, `ExternalInvoicesTab`, `PendingApprovalsSection`, `PublicGuardsPurchaseList`, `InvoiceDialog`). Each tab filters by "in allowed list", plus the switcher's choice.
- Record the multi-branch password rule in `AGENTS.md`.
- Check: unlock with the password, confirm both branches show and switch correctly, and that another branch's data stays hidden.
