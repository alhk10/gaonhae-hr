# Finance: branch group filters and manual bank matching

## 1. Branch filter on Finance (running journal)
- Change the Branch dropdown into two labelled groups:
  - **Singapore:** All Singapore, Balmoral, Jurong West, Kembangan, Yishun, Bukit Merah
  - **Australia:** All Australia, Morley, Greenwood, Yokine, Floreat
- "All Singapore" and "All Australia" combine those five or four branches into one journal, sorted by date with one running balance. Each row shows a small branch tag. CSV and PDF exports follow the selected filter.
- Other branches (Headquarters, Carpe Diem, Centralised Grading) stay available under an "Other" group, so nothing disappears.
- In combined views, Add entry asks which branch the entry belongs to.

## 2. Suggested and manual matching in Bank reconciliation
- **Automatic suggestions:** each unmatched or needs-review transfer lists suggested payments and invoices, ranked by:
  - the closest date and time to the transfer, within ±1 day
  - amount fit: an exact match first, then combinations of invoices that add up to the transfer amount
  - known payer or reference match.

  Each suggestion shows how far apart the time is (for example "2h earlier") and its amount.
- **Manual search:** a "Search other payments" box lets staff look outside the suggestion window.
  - Pick any date range and an amount (exact or range), or search by invoice number, student or customer name.
  - The search covers all Singapore branches and includes external invoices.
- **One transfer → several invoices:** staff can tick several student payments and/or external invoices. A running total shows "Allocated S$X of S$Y". Each invoice can take up to its open balance, and the total can never go above the transfer amount.
  - When allocated equals the transfer, it is fully matched.
  - When allocated is less, it is saved as partially allocated. The remainder stays open and can be matched later.
  - Over-allocation is blocked. Each payment can be linked only once, and shortage payments still can't be verified.
- Confirming verifies the linked payments, or records payments on external invoices for the allocated amount. It also remembers the bank payer name for every student or customer involved. Remembered payers then rank first in future suggestions and can auto-match when amounts fit exactly.
- Every manual match records who did it. Unlink still works for the whole transfer.

## Technical details
- `FinanceTab.tsx`: grouped `SelectGroup`s keyed by branch name; group values `sg-all` / `au-all`. For a group, fetch `access_branch_journal` per branch in parallel. Merge rows (each tagged `branch_id`), compute the opening balance as the sum, and reuse `withRunningBalance`. Currency comes from the group country.
- New RPC `access_bank_suggest(p_password, p_txn_id)`: scores candidates by `abs(received_at - payment/issue time)`, amount fit and payer/ref. It returns student payments and external invoices plus up to 3 exact-sum combinations.
- New RPC `access_bank_manual_search(p_password, p_txn_id, p_from, p_to, p_amount_min, p_amount_max, p_text)`, limit 50.
- New RPC `access_bank_allocate(p_password, p_txn_id, p_allocations jsonb)`. Each item is a `{payment_id}` or `{invoice_id, amount}`. Checks:
  - the sum is at most the transfer amount (cents)
  - each external amount is at most its balance
  - no reused payments and no shortages.

  It links through `bank_transaction_payments`, creating payments for external invoices. It sets the status to `matched` when the sum equals the transfer, otherwise `partial` with the remainder, and upserts `bank_payer_aliases`. The existing `access_bank_match` / `_external` paths stay for auto-match.
- `bank_transactions.status` accepts `partial`; `access_bank_transactions` returns the allocated total and remainder.
- `BankReconciliation.tsx`: suggestion list with time-difference labels, manual search panel, mixed multi-select with an allocated total, and an amount input for external lines (defaults to the smaller of the balance and the remainder).
- Verify: switch to All Singapore and All Australia and check totals equal the sum of the branches. Check suggestions on a real unmatched transfer. Allocate one transfer across two test invoices (one partial), check the remembered payers and the remainder, then unlink.
