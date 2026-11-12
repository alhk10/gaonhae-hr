# Remember payers and add "ANEXT verified" badge

## What you'll get
1. **Remembered payers** – when a transfer is matched to a payment (automatically or with **Match & verify**), the bank payer name (e.g. "TAN AH KOW") is saved against that student.
2. **Auto-match next time** – for the next transfer from a remembered payer, the payment verifies automatically when:
   - amount matches to the cent,
   - date is within ±1 day (Singapore time),
   - the payer is remembered for the student on exactly one pending payment,
   - no unresolved shortage (still superadmin-only).
   Reference match still works as before. If two pending payments qualify, it stays in **Needs review**.
3. **Payer list** – in Bank reconciliation, each matched student shows remembered payers; staff with the all-branch password can remove a wrong one.
4. **"ANEXT verified" badge** – a separate green-teal badge shown next to the existing Paid / Verified status on payments and invoices (Finance, invoice details, payment lists, student profile, Summary) whenever a payment was confirmed by an ANEXT bank transfer. Existing statuses don't change.

## Technical details
- New table `bank_payer_aliases` (student_id, normalised payer_name, created_from_txn, created_by) + grants/RLS (service_role and SECURITY DEFINER only).
- `_bank_apply_match` upserts the alias; `_bank_txn_candidates` adds `payer_known`; `reconcile_bank_transaction` auto-matches on single payer_known candidate.
- Payment-level flag derived from `bank_transactions.matched_payment_id` (exposed via a view/RPC field `anext_verified`), shown by a shared `AnextVerifiedBadge` component.
- Tests for the matching rules; AGENTS.md rule updated.
