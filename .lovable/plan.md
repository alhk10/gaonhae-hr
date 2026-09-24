# Audit and fix: /hello school fees, end to end (including reporting)

## What is already confirmed
- /hello has created 2 school-fee invoices so far, both paid and verified. No automatic-invoice failures in the last 14 days.
- The /access "School Fees" tab (list, verify, reject, invoice preview) reads only the old school-fee submissions table, which has **0 rows**. /hello payments go straight to an invoice and a payment, so **they never show in the School Fees tab or its totals**. This is the main gap.

## Step 1 — Walk the flow and check each hand-off
1. Chat: student recognised, correct classes and prices per branch, 4-week vs full-term, sibling and early-payment discounts, credit shown and used, GST (Singapore 9% on top, Australia 10% included), correct bank/PayNow details.
2. Submit: proof uploaded, screenshot check saved, invoice lines and totals match what the parent saw, duplicate taps blocked.
3. Staff: payment appears for checking (or auto-verifies on a clean screenshot), verify/reject updates the invoice, credit hold settles.
4. After payment: lesson entitlements and chosen class times created; booking failures flagged.
5. Refund as credit works on these invoices.

## Step 2 — Reporting checks
- /access School Fees tab list, counts, status badges, invoice link, student name link.
- /access Summary tab and branch dashboard fee totals / paid counts.
- Sales dashboard, payment management and GST/tax reports include /hello invoices with correct GST.
- Branch P&L picks up the revenue in the right branch and month.

## Step 3 — Fixes (expected)
- Make the School Fees tab list /hello invoices alongside old submissions, with the same verify/reject, delete-with-approval, invoice and student actions.
- Fix any mismatches found in steps 1–2 (totals, GST, missing entitlements, report filters).

## Step 4 — Live test
Run a full payment, part-credit + PayNow, and credit-only through /hello with a test student you name, confirm each appears correctly in every report, then remove the test records.

## Deliverable
A short pass/fail list per step, fixes applied, and anything needing your decision.

## Technical notes
- `get_public_school_fees_list`, `admin_verify_school_fees_submission`, `get_public_school_fees_invoice` all reference `public_chat_payment_submissions` only; none read invoices with `created_by='public_hello_chat'`. Extend the list RPC with a UNION over those invoices + their payments (source flag), and route verify/reject for that source to the payment-level verify path (consume/release credit hold).
- Check entitlement/enrolment creation for chat invoices and report queries filtering by `created_by` or submission tables.
