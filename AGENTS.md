# Project architecture

- Staff slot capacity uses the shared `slotCapacity` weekday and availability helpers, never display-formatted dates as configuration keys, so calendars and branch moves agree on daily limits.

- Resolve invoice PDFs through the saved active template for each invoice's own branch country, never a generic country fallback, so branding and payment details stay accurate after branch changes.
- Public invoice-detail SECURITY DEFINER functions attach only the matched invoice's country template; `/hello` uses its session-validated invoice list to preserve access checks.
- Shared `/access` staff-list presentation uses an `.access-list-shell` container and `.access-list-table` field markers, so rows flow into labelled two-line layouts based on available list width without changing actions or queries.
- `/hello` reusable passport photos and Poom/Dan certificates are private `student-photos` objects, uploaded and previewed only after a server-validated recognized-student chat session; competition forms copy authorized images into each submission and save new profile copies only when the default-on switch remains enabled, so later replacements never alter past entries.
- Convert invoice-edit overpayments through the database function keyed by invoice reference, so the existing invoice reaches zero balance and repeated saves cannot duplicate student credits.- Payroll month adjustments (pro-ration, unpaid/excess annual leave, encashment) come from `payrollAdjustmentsService` and are applied through `computeFullTime` in Payroll Processing, so review, bank and CPF steps always agree.

- `/access` branch passwords may map to several branches (one `access_unlock_passwords` row per branch; `_access_scope` returns a comma list checked with `_scope_has`); the UI keeps one active branch and offers a switcher, so all tabs keep single-branch filtering.
- Duplicate grading payments (same matched student + grading slot) are blocked by a database insert trigger and resolved by staff via credit conversion, so checks can't be bypassed by branch or name spelling.
- Grading, competition and guards submissions auto-verify in a database trigger only when matched and the scanned amount equals the amount due to the cent; existing auto-invoice triggers then create the invoice, so staff and /hello paths share one rule.
- `/hello` checkouts send a stable `client_ref` to `submit_public_chat_invoice`, which returns the existing invoice for a retry and refuses identical items for the same student within 24 hours.

- Every payment insert/update/delete recalculates its invoice via `recalc_invoice_from_payments` (drafts included; pending payments count toward paid), so auto-verified /hello payments never leave invoices showing outstanding.
- Student class attendance lives only in `lesson_bookings` (one row per student/timeslot/date; requested → booked → attended|absent, or rejected), managed through `/access` Attendance RPCs and `/hello` `hello_submit_lesson_request`; a database trigger charges one entitlement lesson per attended/absent mark and refunds it on unmark/delete, so every path agrees on lesson balances.
- Finance is a per-branch running journal in /access (all-branch password only) built live by `access_branch_journal` from payments, cash credit refunds and manual `branch_journal_entries`; the old double-entry ledger/P&L was removed, so never reintroduce posting calls in invoice/payment services.
