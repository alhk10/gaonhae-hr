# Auto-reconcile external invoices with ANEXT bank transfers (Singapore)

## What changes
When an ANEXT bank transfer arrives, it is also checked against **unpaid external customer invoices** (schools/clubs, retail, trial customers) at Singapore branches, including Headquarters. Today only student payments with uploaded proof are matched.

A transfer is matched to an external invoice automatically only when **all** of these hold:
- The amount equals the invoice's outstanding balance to the cent.
- The transfer date is on or after the invoice issue date.
- **And** either the bank reference contains the invoice number (e.g. "INV-202611-0073" or "2026110073"), **or** the payer name matches the customer name (e.g. "CARPE DIEM"), **or** the payer was matched to that customer before.
- Only one invoice fits. If several fit, the transfer goes to **Review** for staff.

When matched, a verified bank-transfer payment is recorded on the invoice, the invoice becomes paid, and the transfer shows as matched in Bank reconciliation, with the invoice listed.

Staff can also match a transfer to an external invoice by hand in Bank reconciliation. That payer name is then remembered for the customer, so the next transfer from them matches automatically.

Transfers that don't match exactly, such as part payments, go to **Review** instead of being applied. Australian branches are unchanged.

## Technical details
- New `bank_payer_aliases` support for external customers: add a nullable `customer_name` column (with `student_id` made nullable) so aliases can point to an external customer name.
- `_bank_external_candidates(txn)`: unpaid/partial external invoices at Singapore branches, `round(balance_due*100) = round(amount*100)`, issue date <= received date (SGT), with ref match (`_bank_ref_match` on invoice number and digits-only form), name match (normalized payer contains the normalized customer name or its first word) and known-payer flags.
- `reconcile_bank_transaction`: after the existing student-payment steps find nothing, if exactly one external candidate has a ref/name/known-payer match → insert a `payments` row (bank_transfer, verified, reference = txn ref, amount = txn amount) and a `bank_transaction_payments` link, then set the transaction to matched. The existing payment triggers recalculate the invoice. Otherwise, if any candidates exist, set the status to `review` with the reason "Matches an external invoice amount".
- `access_bank_match` (manual): accept an external invoice id, create the payment the same way, and save the payer alias.
- Bank reconciliation tab: show external invoice candidates (customer name, invoice number, balance) in the match picker.
- Re-run reconciliation once over the 77 existing unmatched transfers.
- Update the ANEXT bank-reconciliation rule in AGENTS.md to cover external invoices.
- Verify with a test transfer against INV-202611-0072 in a rolled-back test, plus a check that a non-exact amount goes to review.
