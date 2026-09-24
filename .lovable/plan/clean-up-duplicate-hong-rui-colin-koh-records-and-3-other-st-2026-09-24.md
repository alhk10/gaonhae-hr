# Clean up duplicate HONG RUI COLIN KOH records (and 3 other students)

## What's happening
- HONG RUI COLIN KOH has **37 records**. The real one is **STU260325** (Black Tip, created June, has his June grading invoice). The other 36 are "trial" copies at Jurong West, marked 1st Poom, all created between 19 and 22 Sept.
- The same thing happened to 3 other students, copied at the same moments: **ADRIAN QUAH, HEE KIAT DYLAN TAN, ZAYLEE EN XIN TAN** (36–37 records each). That makes **144 extra records** in total.
- All four were copied together every time, in bursts of a few minutes. That points to an automated repeat (most likely testing of the new "Add student / merge" tools on /access), not to parents or staff.
- Most copies have nothing linked to them. **4 invoices** are attached to copies. There are no enrolments, grading submissions or credits on them.
- Today's grading submission (GP-202609-0183, DOB 24/12/2015) lists all these copies as "52% match", which is why the Match dialog looks like this.

## Plan
1. **Confirm the cause**: check the change history and audit logs for the copies to find which action created them.
2. **Move the 4 invoices** (and any payments on them) back to each student's original record.
3. **Delete the 144 copies**, keeping each student's oldest real record. Log each deletion in the audit history.
4. **Match Colin's new grading submission** to STU260325. It is 1 day off his DOB, so the existing one-day correction rule applies.
5. **Prevent a repeat**: creating a student with the same name + birth date + branch as an existing record will be refused. Anyone who really needs a separate record can still confirm it (the force option stays). Any test tooling will also clean up after itself.

## Technical details
- Copies: students created after 2026-09-19 whose first_name/last_name/DOB match an older record, limited to the 4 names above. The 4 linked invoices get student_id updated to the original id before the delete.
- The cleanup is a data fix using run_sql with a WHERE clause, after a dry-run count.
- admin_create_student_public already has a duplicate check. We will confirm why it didn't catch these copies (for example, whether force was passed) and tighten it.
