# Auto-reconcile ANEXT PayNow/FAST emails in Finance (Singapore)

## What you will get
- The Gaonhae Gmail inbox that gets ANEXT alerts is checked automatically every 10 minutes.
- Each ANEXT "You have received SGD..." email becomes an **incoming bank transaction**: amount, date and time, payer name, account ending, method (PAYNOW/FAST) and Transaction Ref.
- A matching pending payment at a Singapore branch is **auto-verified** only when all three agree:
  1. **Amount** matches to the cent.
  2. **Date** matches the payment date. Same SGT day, or one day either side when a transfer is made late at night.
  3. **Reference** matches. This is the bank Transaction Ref read from the uploaded proof image.
- If exactly one payment matches, it is verified and the invoice updates through the normal payment rules. If there are several possible matches or no match, the transaction is left for staff.
- The Finance tab gets a new **Bank Reconciliation** view (all-branch password only). It has:
  - Filters: Matched, Unmatched and Needs review.
  - Each transaction's payer, amount, date and reference, plus the linked invoice and student.
  - For unmatched items, suggested payments based on amount and payer name, and a button to match one by hand.
  - A **Sync now** button and the time of the last sync.
- Each email is processed only once, so the same transfer can never verify two payments.

## Things to know
- Until you connect it, I can't confirm that the Gmail connection works. A connect card will appear when the build starts.
- Older proofs where the reference was never read will not auto-match on reference. They will show as suggestions for staff to confirm. A rescan option will also fill in the missing reference.
- Payment shortages are still resolved by superadmin only. A bank email never clears a shortage by itself.

## Technical details
- Link the Gmail App connector (builder account) and use it through the connector gateway from an edge function.
- New table `bank_transactions`: gmail_message_id (unique), txn_ref (unique), amount, currency, received_at, payer_name, account_last4, method, raw_snippet, status (unmatched/matched/review), matched_payment_id, matched_by, matched_at. Includes GRANTs, RLS and access only through SECURITY DEFINER `access_*` RPCs gated by all-branch scope.
- `payments` gains a nullable `bank_txn_ref`. `scan-payment-proof` pulls the "Transaction Ref"/reference number from proof images, saves it, and supports rescan.
- New edge function `anext-email-sync`:
  - Searches `from:anext.com.sg "You have received"` newer than the last stored message.
  - Parses with a regex based on the sample: `received SGD([\d,.]+) on DD/MM/YYYY HH:MM\(SGT\) from (.+?) to your account ending (\d{4}) via (PAYNOW|FAST)` plus `Transaction Ref: (\d+)`.
  - Upserts by message id, then calls DB function `reconcile_bank_transaction(id)`.
- `reconcile_bank_transaction` looks only at pending non-cash payments on SG-country branches. It requires an exact cent amount, a date within ±1 day and an equal `bank_txn_ref`, and verifies only when exactly one candidate exists. It locks rows, sets the payment to verified, links the transaction and relies on the existing payments trigger, so `recalc_invoice_from_payments` runs. It logs to `security_audit_log`.
- A `pg_cron` job calls the sync every 10 minutes. The Finance UI also has Sync now and manual match/unmatch RPCs.
- Tests: a parser unit test using the sample email (SGD370.60, 11/11/2026 12:23, THEI NWE MYET SHU HTWE, 7649, PAYNOW, ref 20261111122338001929648523661) and matching-rule tests covering amount mismatch, date outside the window, reference mismatch and multiple candidates.
- AGENTS.md rule: bank emails verify payments only through `reconcile_bank_transaction` with exact amount, date window and reference, deduplicated by Transaction Ref.
