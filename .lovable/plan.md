# Fix blank competition invoices

## What's wrong

11 invoices imported from competition payments show no items, a $0 total and a $0 payment (e.g. INV-202609-0277 HENRIK YEONG, INV-202609-0282 ANISSA KOH).

Confirmed cause: the import builds the invoice lines only from the submission's breakdown fields (coaching amount + extra lines). 15 of the 79 competition payments have no breakdown at all — only a single total amount (e.g. $392.40, $294.30). For those, no line is written, so the invoice and its payment both end up at $0. The remaining 64 submissions carry a breakdown and imported correctly.

## The fix

1. When a competition payment has no breakdown, fall back to the amount the person actually paid and write one invoice line for it (described with the event name, e.g. "Competition Registration"). Payments with a breakdown keep importing exactly as they do today.
2. As a safety net, if the lines still add up to less than the amount paid, add a balancing line so the invoice total always equals the payment.
3. Repair the 11 existing blank invoices: add the missing line from their submission amount, set the invoice subtotal, total and amount paid, and correct the linked $0 payment to the real amount. Nothing is deleted and no invoice numbers change.
4. The 4 not-yet-imported submissions of this kind will then import with the correct amount.

## Technical notes

- Rewrite `public.admin_import_competition_submission`: after the coaching line and the `extra_lines` loop, if `v_total = 0` (or `v_total < sub.amount`), insert a line for `sub.amount - v_total` using the already-resolved `v_product_id` and `v_event_name`. Totals, `amount_paid`, `balance_due` and the payment row keep using `v_total`.
- Data repair via a data-change statement over the 11 invoices whose notes reference a competition submission and which have zero items: insert one `invoice_items` row per invoice (product = the submission's resolved product or the "Competition Registration" fallback, unit_price/total = submission amount), then update `invoices` (subtotal, total_amount, amount_paid, balance_due = 0) and the matching `payments` row amount.
- No table or column changes.
