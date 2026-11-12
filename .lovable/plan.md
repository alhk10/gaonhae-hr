# Remember family payers and add "ANEXT verified" badge

## What you'll get
1. **Remembered payers (family-friendly)** - when a transfer is matched, the bank payer name (e.g. "TAN AH KOW") is saved against every student it paid for. One payer can be linked to several siblings, and a student can have several payers (mum, dad).
2. **Auto-match next time** - a later transfer from a remembered payer verifies automatically when:
   - the date is within 1 day (Singapore time),
   - there's no unresolved shortage (still superadmin-only),
   - and either one pending payment for that payer's students equals the amount to the cent, or their pending payments add up to it exactly (e.g. one transfer covering two siblings' invoices).
   Reference matching still works as before. If more than one combination fits, the transfer stays in **Needs review**.
3. **Match several payments at once** - **Match & verify** lets staff tick more than one pending payment for a single transfer. The ticked total must equal the transfer to the cent.
4. **Payer list** - Bank reconciliation shows each remembered payer with their linked students. Staff with the all-branch password can unlink a wrong one.
5. **"ANEXT verified" badge** - a separate badge shown beside the existing Paid / Verified status on payments and invoices (Finance, invoice details, payment lists, student profile, Summary) when a payment was confirmed by an ANEXT transfer. Existing statuses stay the same.

## Technical details
- New table `bank_payer_aliases` (normalised payer_name, student_id, unique pair) with grants and RLS; access only through SECURITY DEFINER functions.
- New link table `bank_transaction_payments` (txn_id, payment_id unique) so one transfer can verify several payments but each payment is verified by only one transfer. Backfill rows that are already matched.
- `_bank_apply_match` takes a payment list, verifies each payment, recalculates its invoice and saves an alias for each student. `reconcile_bank_transaction` tries a single payment first, then the one exact-sum set across the payer's linked students.
- `access_bank_match` accepts an array of payment ids.
- `anext_verified` is derived from the link table and shown by a shared `AnextVerifiedBadge`.
- Add tests for the matching rules, update the AGENTS.md rule and add a roadmap item.
