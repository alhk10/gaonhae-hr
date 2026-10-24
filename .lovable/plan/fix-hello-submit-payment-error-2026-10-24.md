# Fix /hello "Submit payment" error

## What's wrong
Paying an outstanding invoice in /hello fails with "violates check constraint payments_verification_status_standard_check". The /hello invoice payment step saves the payment with status `pending_verification`, but the payments table only accepts `pending`, `verified` or `rejected`. So every /hello invoice payment (PayNow, bank transfer and credit portion) is rejected and nothing is saved.

## Fix
1. Update the /hello invoice payment function (`pay_public_chat_invoice`) to save `pending` instead of `pending_verification` for both the credit and the PayNow/bank payment rows. Everything else (credit-first, no new invoice, duplicate protection, proof link) stays the same.
2. Check the other database functions that still use `pending_verification` and change any that write it into payment status; leave invoice/other statuses untouched where that value is valid.
3. Verify by reading the live function definition, then confirm the submission no longer errors and the payment appears in staff payment review as pending.

## Technical details
- New migration re-creates `pay_public_chat_invoice` from the latest definition (20261013014721) with `'pending_verification'` -> `'pending'` in both `payments` inserts.
- Grep earlier functions listed in migrations for `payments` inserts/updates using `pending_verification` and patch the same way.
