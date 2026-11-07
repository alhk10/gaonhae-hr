# Fix: Teoh Kar Yee draft invoice could not be deleted

## What was found
- Teoh Kar Yee has two invoices: INV-2026-00529 (draft, Balmoral) and INV-202610-0019 (verified).
- No delete or change request exists for either invoice, and none were made by anyone in the last 10 days, so the superadmin pages had nothing to show.
- INV-2026-00529 is a draft. Draft invoices don't go for approval. Branch staff delete them directly. The direct delete is failing, so the invoice is still there and no request was made.
- Cause: the delete step writes an audit note but leaves out the required "who did it" field. The database refuses the note, so the whole delete is undone. This affects every branch-password draft delete, not just this one.

## Fix
1. Update the draft-delete function so the audit note always fills "who did it" (for example "access: balmoral"). Then the delete goes through.
2. Check the other branch-password functions that write the same audit notes (draft edit, payment, password and refund actions) and fill that field in each one, so none of them fail the same way.
3. After the fix, delete INV-2026-00529 only if you confirm the branch still wants it gone. Otherwise Balmoral staff can delete it again themselves.
4. Test: run a draft delete with a branch password on a test draft and confirm the invoice, its line and its lesson entitlement are removed and the audit note is saved.

## Technical details
- `access_delete_draft_invoice` inserts into `security_audit_log(action, details)`, but `user_email` is NOT NULL. Set `user_email = 'access:' || v_scope`.
- Use `rg`/`pg_proc` to find all functions that insert into `security_audit_log` without `user_email` and patch them in the same migration.
