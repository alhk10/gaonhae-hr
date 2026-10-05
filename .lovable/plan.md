# Fix: auto-verified payments leave invoices at "Paid"

## What's wrong

The rows in your screenshot (e.g. INV-202610-0046, -0045, -0044) all have their PayNow payment **verified**: the screenshot check matched the amount and confirmed it automatically. Their invoices still say **Paid** because the step that moves an invoice to "Paid & Verified" never ran for those automatic confirmations.

Across all invoices, 33 are fully paid with every payment verified but still show "Paid". INV-202610-0036 (Duncann Tan, short $10.90) and INV-202610-0030 are correctly still "Paid" because staff haven't checked them yet.

## Fix

1. Make the invoice update run whenever a payment gets verified, whether by staff or by the automatic screenshot check.
2. Correct the 33 existing invoices to "Paid & Verified". Each change gets logged in the existing corrections log.
3. No changes to how the School Fees list looks. Once the data is fixed, those rows will show "Paid & Verified" by themselves.

## Technical notes

- Cause: `trg_auto_verify_matched_scan` is a BEFORE UPDATE OF `proof_scan_status` trigger that sets `verification_status = 'verified'`. `trg_sync_invoice_status_from_payments` is `AFTER ... UPDATE OF verification_status, amount`. Postgres column-list triggers only fire for columns named in the UPDATE's SET clause, not columns changed by a BEFORE trigger. So the sync never fires for auto-scan verifications.
- Migration: recreate the sync trigger as `AFTER INSERT OR DELETE OR UPDATE ON payments` (no column list), with `WHEN` guarded inside the function (it only writes when the status actually changes, so this stays cheap).
- Data pass: set `status='verified'` on invoices that are not cancelled or draft, where `balance_due <= 0.01` and every payment is verified. Log each one to `status_normalisation_log`.
- Verify: re-run the count query (expect 0) and reload /access School Fees.
