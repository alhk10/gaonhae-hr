# Students attending multiple branches

## What changes
- A student keeps one **home branch** and can have **extra branches**. Only superadmin and the all-branch password (Hp97533488) can add or remove extra branches, from the student's details in /access Students tab and the superadmin student page.
- The student shows in **every branch they attend**: each branch's Students tab, Attendance search/add, Grading list and the branch dashboard. A small "Also at: X, Y" or "Home: X" badge shows on their row.
- **Paying per branch:** any branch can invoice the student for its own term as today. Each branch's term badge looks at that branch's invoices first.
- **One term for several branches:** superadmin or Hp97533488 can tick "Valid at branches" on a Classes line in Create Invoice. That creates one pool of lessons (e.g. 12) usable at any ticked branch. Attending at any of them uses up the same pool.
- **Payments and finance at the home branch:** every invoice and payment for a multi-branch student is recorded under their home branch, whichever branch issues it. The Finance journal, branch reports and bank matching all show it at the home branch. Other branches show the lessons used but not the income.
- /hello: a recognised student sees the timetable and can request classes at every branch they attend. Lessons from a shared term can be used at each one.
- Monthly student counts and term-paid badges treat a shared term as paid at every branch it covers. A student paying separately at two branches counts at both.

## Technical details
- New table `student_branches(student_id, branch_id text, added_by, created_at)` with grants and RLS. Edits only through the SECURITY DEFINER `access_student_branch_set(p_password, student, branch, on)`, which needs the all-branch password or superadmin. Each change is logged in `student_change_logs`.
- Helper `_student_at_branch(student, branch)` returns true when it's the home branch or a listed one. Use it in the access student lists, attendance search/add (`access_attendance_students`, `searchAttendanceStudents`), grading lists, `student_term_coverage` / `term_payment_statuses` / `access_student_invoice_dues` (branch-filtered), and `/hello` timetable and lesson-request branch checks.
- Shared lessons: add `entitlements.branch_scopes text[]` (null = current behaviour). Update the booking trigger and lesson-balance checks (`_lesson_bookings_entitlement`, `_lesson_balance`) to match `branch_scope = branch OR branch = ANY(branch_scopes)`. InvoiceDialog stores `metadata.valid_branch_ids` on the line, and the entitlement generator copies it into `branch_scopes`. The extra-branch picker is shown only to superadmin and Hp97533488.
- `_term_coverage` counts a shared-term invoice for every branch in its scope. `get_public_student_counts_by_month` uses the same rule.
- Home-branch finance: invoices keep `invoices.branch_id` = the student's home branch, and add `metadata.issued_at_branch` to record where staff created it. InvoiceDialog and `submit_public_chat_invoice` set this automatically. `access_branch_journal`, the payment lists and the bank candidates already key on `invoices.branch_id`, so they follow without other changes. The invoice PDF template follows the home branch's country.
- Add tests for the term-coverage rule across branches and the scope check. Record the rule in AGENTS.md and save it to memory.
