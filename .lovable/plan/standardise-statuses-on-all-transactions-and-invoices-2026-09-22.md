# Standardise statuses on all transactions and invoices

Right now the wording is already standardised on screen, but the stored status behind each record still varies by source. This plan makes the stored status itself follow one set of words everywhere — school fees, students, grading, competitions, seminars, uniforms & guards, and invoices — for both past and future records.

## The standard set

Transactions (grading, competitions, seminars, school fees, uniforms & guards):

- `pending_verification` — payment received, staff have not confirmed it yet (amber)
- `verified` — payment confirmed (green)
- `rejected` — payment turned down (red)
- `cancelled` — withdrawn or voided (grey)

Invoices:

- `draft` — created, not issued
- `unpaid` — issued, nothing paid
- `partially_paid` — part payment received
- `paid` — fully paid, awaiting confirmation
- `verified` — paid and confirmed
- `cancelled` — voided

Students stay `active`, `inactive`, `trial`, `withdrawn` (already consistent).

## What gets corrected in existing data

Checked against the live records:

- 671 invoices sit at "Paid" even though every payment on them is already confirmed — these move to "Paid & Verified".
- 12 invoices stay at "Paid" because a payment is still waiting for staff confirmation.
- 1 invoice is marked confirmed while money is still outstanding — it moves back to the correct unpaid/partly paid state based on its balance.
- Grading, competition, seminar and guards transactions already use the standard words; any stray value found during the run is mapped to the closest standard one.

Every change is written to the existing corrections audit list so staff can see what was adjusted.

## Keeping it standard going forward

- Add a rule on each table so only the standard words can be saved.
- Update the places that create or change these records (public form submissions, staff verification, invoice creation, payment recording, rejection and cancellation) so they always write the standard word — including automatically moving an invoice to "Paid & Verified" once its payments are confirmed.
- Point every list and filter at the shared status badge so labels and colours stay identical across /access, the branch dashboard and the superadmin dashboard.

## Technical notes

- Migration: `CHECK` constraints on `grading_payment_submissions.status`, `competition_payment_submissions.status`, `seminar_payment_submissions.status`, `public_chat_payment_submissions.status`, `guards_purchases.sale_status`, `invoices.status`, plus `payments.verification_status` (`pending`/`verified`/`rejected`).
- Data pass: normalise existing values, then recompute `invoices.status` from `balance_due` and the verification state of related `payments`; log each change to `payment_amount_corrections` (extended with a `kind` column) or a small `status_normalisation_log`.
- Trigger on `payments` to promote an invoice from `paid` to `verified` when all its payments are verified, and to demote on rejection.
- Update the admin verify/reject/import RPCs and `invoiceService` / submission services to write only canonical values.
- Frontend: remove any remaining local status maps in favour of `StatusBadge.normalizeStatus`, and align filter option values.
