# Finance: branch group filters and manual bank matching

## 1. Branch filter on Finance (running journal)
- Change the Branch dropdown into two labelled groups:
  - **Singapore:** All Singapore, Balmoral, Jurong West, Kembangan, Yishun, Bukit Merah
  - **Australia:** All Australia, Morley, Greenwood, Yokine, Floreat
- "All Singapore" and "All Australia" combine those five or four branches into one journal, sorted by date with one running balance. Each row shows a small branch tag. CSV and PDF exports follow the selected filter.
- Other branches (Headquarters, Carpe Diem, Centralised Grading) stay available under an "Other" group, so nothing disappears.
- In combined views, Add entry asks which branch the entry belongs to.

## 2. Manual matching in Bank reconciliation
- Every unmatched or needs-review transfer gets a **Find invoice manually** button.
  - It opens a search by invoice number, student or customer name, or amount, across all Singapore branches, including external invoices.
  - Results show open student payments (pending) and invoices with a balance.
- Staff can tick one or more student payments, or pick one external invoice. The same safety rules apply: the amounts must add up exactly to the cent, there must be no shortage, and each payment can be used only once.
- Confirming verifies the payment(s) and remembers the bank payer name for those students or that customer. Their next transfer can then match automatically. The Remembered payers list shows them as today.
- The ±1-day date window is relaxed for manual matches only (the staff member confirms). Every manual match records who matched it.

## Technical details
- `FinanceTab.tsx`: grouped `SelectGroup`s keyed by branch name; group values `sg-all` / `au-all`. For a group, fetch `access_branch_journal` per branch in parallel. Merge rows (each tagged `branch_id`), compute the opening balance as the sum, and reuse `withRunningBalance`. Currency comes from the group country.
- New RPC `access_bank_manual_search(p_password, p_txn_id, p_query)` (all-branch / SG staff scope): returns pending non-rejected payments and external invoices with a balance, filtered by text/amount, limit 30.
- `access_bank_match` / `access_bank_match_external` gain `p_manual boolean default false`, which skips only the date-window check; exact-cent, shortage and single-use checks stay. Payer alias saving already happens in these functions. Verify they still write `bank_payer_aliases` when `p_manual` is true.
- `BankReconciliation.tsx`: add a manual search dialog that reuses the existing selection-total check.
- Verify: switch to All Singapore and All Australia and check totals equal the sum of the branches. Manually match a real unmatched transfer to a test payment, check the remembered payer appears, then unlink.
