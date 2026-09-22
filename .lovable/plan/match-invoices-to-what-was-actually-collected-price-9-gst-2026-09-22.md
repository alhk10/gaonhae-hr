# Match invoices to what was actually collected (price + 9% GST)

## What is wrong today

Confirmed from the database and the public payment pages:

- The public grading page asks for **price + 9%** (a $420 grading is charged $457.80), and the uploaded slips show $457.80 received.
- The invoice created from that submission records **$420 total**, split as if the $420 already included GST ($385.32 + $34.68). So the invoice under-states both the fee and the GST, and the recorded payment ($420) does not match the money received ($457.80).
- Older grading submissions stored the base price ($420); submissions from 20/09 onward store the inclusive amount ($457.80). The grading list always multiplies the stored amount by 1.09, so newer rows will show 9% too much.
- The same inclusive split was applied across all public payment types in an earlier correction.

## How past records get corrected

Only where the uploaded payment slip proves the amount:

1. Read the stored payment slips for every past public submission (grading, competitions, seminars, school fees, uniforms & guards) that has a proof image and an invoice. Slips are read in small batches by a background job, and each result is saved so re-runs skip finished work.
2. Where the slip amount equals **fee + 9%**, rebuild that invoice as fee + 9% GST: item price = fee, GST = 9%, total = slip amount, and raise the recorded payment to the slip amount.
3. Where the slip amount equals the current invoice total, leave it alone.
4. Everything else (unreadable slip, no slip, or an amount that matches neither) is left untouched and listed in a **Payment amount review** list on /access for staff to settle manually, showing invoice total, slip amount and student.

Nothing is deleted, no status changes, and no invoice is reduced without slip evidence.

## Going forward

- Grading invoices are created as price + 9% GST, so the total always equals what the parent was asked to pay.
- Store the fee and the GST separately on submissions so nothing is guessed later.
- Fix the grading list so it stops adding 9% to amounts that already include it.
- Apply the same rule to competitions, seminars, school fees and uniforms & guards so the public form price, the slip and the invoice always agree.

## Technical notes

- `admin_import_grading_submission` (and the competition / seminar / school-fees / guards equivalents) currently insert `subtotal = total = submission.amount`, `tax_amount = 0`; a later trigger/backfill split it inclusively. Change them to resolve the **net fee** from the submission metadata or product branch price, then set `subtotal = net`, `tax_amount = round(net * gst_rate, 2)`, `total = subtotal + tax`, `invoice_items.tax_rate = gst_rate`, and create the payment for the total.
- Add `amount_net` and `gst_amount` columns to the public submission tables, written by the public pages, so imports never have to infer whether `amount` is inclusive.
- `PublicGradingList.tsx` line 1545 and the branch-collection table (lines 1027-1057) must use the stored inclusive amount instead of multiplying by 1.09.
- Proof re-scan runs through the existing `openai/gpt-6-astra` proof-scan path, written into `proof_scan_amount` / `proof_scan_details`, driven by a bounded batch job with a lease lock, per-row progress marking and a pause on credit/rate-limit errors (~770 submissions with proofs, only 10 scanned so far).
- Correction runs in a single SQL routine per invoice, updating `invoices`, `invoice_items` and `payments` together, writing an audit row with the slip amount used as evidence.
- Statuses, invoice numbers, enrolments, entitlements and credits are untouched.
