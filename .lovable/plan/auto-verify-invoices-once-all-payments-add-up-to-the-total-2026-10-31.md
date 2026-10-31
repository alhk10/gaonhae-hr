# Auto-verify invoices once all payments add up to the total

## What happens today
Each payment is checked against its own proof, one at a time. When a first payment is short and the family sends a second payment for the rest, both stay "pending" and the invoice stays in Payment shortages until superadmin acts.

What the live data shows for the 5 shortages on screen:

| Invoice | 1st proof | 2nd payment | Combined vs total |
|---|---|---|---|
| INV-202610-0051 Heng Yuan Hu | S$460.00 | S$41.40 recorded, proof read as S$82.80 | S$501.40 = total |
| INV-202610-0059 Jia Hang Zou | S$460.00 | S$41.40 recorded, proof read as S$82.80 | S$501.40 = total |
| INV-202610-0204 Nur Islah | S$449.55 | S$35.50 (verified) | S$485.05, still S$16.35 short |
| INV-202610-0091 Kai Randhawa | S$457.80 | none | 4 cents short |
| INV-202610-0099 Zhan Ming Yong | S$545.00 | none | 4 cents short |

For 0051 and 0059 the second proof was read as S$82.80, which is double S$41.40. It most likely shows both kids' transfers on one screenshot (the siblings paid together), so that payment got flagged as a mismatch as well.

## New rule
Whenever a payment is added, changed or scanned, the system adds up all the proof-confirmed amounts on that invoice:

- **Combined amount equals the invoice total to the cent:** every pending payment on the invoice is verified automatically, the shortage is closed, and the invoice becomes Paid & verified. This also starts the usual invoice steps, such as grading.
- **Combined amount is still below the total:** it stays in Payment shortages and shows the new remaining amount. Staff can record another payment there.
- **Second proof reads higher than the amount recorded** (like the S$82.80 shared screenshot): the recorded amount counts, but only when that is exactly what's needed to reach the invoice total. Anything else still goes to superadmin.
- A rejected payment never counts toward the total.
- Superadmin's Accept scanned, Confirm full and Reject buttons stay as they are.

After it's built, I'll run the check once on existing invoices. That should clear 0051 and 0059 right away, and leave 0204, 0091 and 0099 for you to decide.

## Technical details
- Add a database function `_auto_verify_invoice_payments(invoice_id)`. It sums each non-rejected payment's counted amount, using `proof_scan_amount` when the scan matches. For a scan above the recorded amount, it counts the recorded amount only if that exactly closes the gap. If the sum equals `invoices.total_amount` exactly, it sets those payments to verified (`is_verified`, `verified_at`, `verification_status='verified'`) and records the reason in `proof_scan_details`.
- Call it from the existing trigger after `recalc_invoice_from_payments` runs on payment insert and update. A guard flag stops it from calling itself again when it does its own update.
- Run a one-time backfill over invoices that have pending or shortage payments.
- Add a test for the matching rule: exact to the cent, a 4-cent shortfall stays, and a doubled second proof.
- Add one rule to AGENTS.md.
