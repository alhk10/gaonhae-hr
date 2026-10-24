# Fix: /hello payments verified but invoice still "Draft / unpaid"

## What I found
- Royce Wee's invoice **INV-202610-0143** ($904.70) has **two** PayNow payments of $904.70 (13:53 and 14:25 today). The screenshot check matched both, and both were automatically verified, but the invoice still shows Draft, $0 paid, $904.70 due.
- His brother **Rayner Wee's INV-202610-0144** has the same problem: one verified payment of $904.70, but the invoice still shows Draft and unpaid.
- Royce's second payment most likely happened because the invoice still looked unpaid after the first one, so his family paid again.
- These are the only two invoices since April where the payments and the invoice's paid amount disagree.

## Why it happened
1. When the screenshot amount matches, the system marks the payment verified, but the step that updates the invoice's paid amount and status never runs on that path.
2. The backup step that keeps invoice status in line with payments skips invoices still in Draft. Both invoices were drafts created by staff and then paid from the /hello outstanding-invoice screen.

## Fix
1. Make every verified payment update its invoice (paid amount, balance, status), including automatic verifications and Draft invoices.
2. Make sure the /hello "Outstanding invoices" list and popup leave out invoices whose balance is already covered by payments waiting for review, so families aren't asked to pay twice.
3. Correct the existing records:
   - INV-202610-0144 (Rayner) becomes paid and verified, $0 due.
   - INV-202610-0143 (Royce) becomes paid and verified. The extra $904.70 becomes student credit for Royce through the existing overpayment-to-credit flow, which shows in /hello and is used automatically on his next invoice.
4. Recheck all invoices afterwards to confirm none still disagree with their payments.

## For you to check
Each of the two invoices has the same line twice ("Little Gaonhae 1x Weekend x12", $452.35 each) with no term name attached. If that was meant to be two different terms, no change is needed. If it's a duplicate, let me know and I'll treat the extra line separately.

## Technical
- Migration: change `trg_after_auto_scan_verified` to an `AFTER UPDATE` trigger without a column list, firing when `OLD.verification_status IS DISTINCT FROM NEW.verification_status` (the BEFORE trigger on `proof_scan_status` changes the status inside the same update, so the column-list trigger never fires). In `sync_invoice_status_from_payments`, stop skipping drafts that have payments and call `recalc_invoice_from_payments`.
- Outstanding-invoice function used by /hello: subtract pending (not rejected) payments from the balance shown.
- Data repair: run recalculation on both invoices, then the existing overpayment-to-credit function keyed by invoice number for INV-202610-0143.
