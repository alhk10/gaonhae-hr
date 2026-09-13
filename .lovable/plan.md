# Refund button everywhere + credit balance on student profile

## Part 1 — Missing Refund buttons

Current state (checked):

- Superadmin dashboard "Invoices" list **does** have a Refund button, but it is the last column of a wide table. On a phone-width screen the table scrolls sideways, so the button sits off-screen and looks missing.
- /access **Competitions** and **Seminars** rows are not wired to the refund dialog yet, although each row already carries the invoice it created.
- /access **Grading** rows are not wired either, and the grading list does not currently carry an invoice reference at all, so it needs a data change first.
- School Fees and Uniforms & Guards already have the button.

What changes:

- **Superadmin Invoices list**: on narrow screens the rows become a stacked card (student, amount, due, status, Refund) so the Refund button is always visible without sideways scrolling. On desktop the table stays as-is.
- **/access Competitions**: a Refund action on each row that has an invoice; hidden when there is no invoice, disabled when the invoice is not paid/verified.
- **/access Seminars**: same Refund action.
- **/access Grading**: same Refund action, once the grading list returns the invoice each row belongs to.

All four open the same Refund as credit dialog already in use: tick the lines to refund, see the running credit total, enter a reason, then "Refund now" for superadmins or "Submit request" for everyone else. Lists refresh afterwards.

## Part 2 — Credit balance on the student profile

The sales student profile page (opened from the student list) shows total classes, attendance rate, sessions left and outstanding balance, but no credit balance. A **Credit balance** figure is added to that summary block, shown in green when there is credit available, and it refreshes after a refund. The other student record page already shows this, so wording and colour will match.

## Technical notes

- `get_public_grading_list` gains an `invoice_id` column: `grading_payment_submissions.matched_invoice_id` for submission rows, and for registration rows the invoice behind `grading_registrations.invoice_item_id` (join `invoice_items`). `PublicGradingListRow` gains `invoice_id: string | null`. Migration recreates the function only; no table change.
- Competition rows use `PendingCompetitionSubmission.matched_invoice_id`; seminar rows use `PublicSeminarListRow.matched_invoice_id` — no data change needed.
- Each tab gets local `refundInvoiceId` state plus one `RefundAsCreditDialog` instance, mirroring `SchoolFeesTab.tsx` / `PublicGuardsPurchaseList.tsx`, with `onRefunded` invalidating that tab's query.
- `InvoicesCreatedSection.tsx`: table wrapped for `sm+`, a mobile card list below `sm`, same data and same disabled rule (`paid | verified | partially_paid`).
- `StudentProfile.tsx` loads the balance via `getStudentCreditBalance` from `studentCreditService` and passes it into `StudentHeader` as an extra stat.
