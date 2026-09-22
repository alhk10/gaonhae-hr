# Automatic invoicing when paid & verified and matched

Today, a payment only becomes an invoice if a superadmin opens the approvals list — the browser page runs the matching and invoicing sweep. Anything verified and matched outside that page waits. Right now 4 grading and 10 seminar payments are verified and matched with no invoice.

The fix moves invoicing into the database, so it happens the moment a payment is both confirmed and linked to a student, no matter who does it or where.

## What will change

- Grading, competition and seminar payments create their invoice automatically as soon as the payment is verified and linked to a student — in either order (verify first, then match, or match first, then verify).
- School fees and uniforms & guards already create the invoice at the moment of linking; they get the same safeguard so an invoice is never created twice and never skipped.
- The existing 14 payments that are verified and matched without an invoice are invoiced as part of this change.
- Anything that fails to invoice automatically (missing product, missing price, rejected payment) is left untouched and still shows in the approvals list with the reason, so staff can fix and retry.
- The approvals page keeps its "Scan & match" button, but it becomes a safety net rather than the thing that creates invoices.

## What stays the same

- Nothing is invoiced before it is verified, and nothing is invoiced while unmatched.
- Rejected and cancelled payments are never invoiced.
- Invoice numbering, amounts, GST, credits and payment records follow exactly the rules already in place for each type.

## Technical approach

1. Add `AFTER INSERT OR UPDATE` triggers on `grading_payment_submissions`, `competition_payment_submissions` and `seminar_payment_submissions` that fire when `status = 'verified'` and `matched_student_id IS NOT NULL` and no invoice is linked yet.
2. Refactor each `admin_import_*_submission` function into an internal `SECURITY DEFINER` core (no `has_branch_access` gate, invoked only by the trigger) plus the existing admin-facing wrapper that keeps the permission check. Cores stay idempotent: re-check the invoice link inside a row lock before inserting.
3. Trigger bodies wrap the core in an exception block — a failure records the reason (submission `import_error` style column or existing notes field) and does not roll back the verification/match.
4. Apply the same "already linked?" guard inside `admin_match_school_fees_submission` and the guards match path, and require verified status there before creating the invoice.
5. Backfill: run the core function for the 4 grading and 10 seminar rows currently verified, matched and un-invoiced; report any that error.
6. Frontend: in `UnifiedSubmissionApprovals.tsx`, keep the sweep but treat all sources as "invoice is created server-side" — it only reports rows the database could not invoice, avoiding duplicate import attempts and false "import failed" toasts.
7. Verify with database queries that no verified+matched row is left without an invoice, and that amounts match submission totals; then run typecheck and build.
