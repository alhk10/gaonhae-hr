# Fix Farhan Shaikh guards order wrongly filed under Lana Farhan Yusoff

## What will change
1. **Re-link the order:** Guards order GP2607238915 (S$284.30, PayNow, collected 26/09/2026) is moved from LANA FARHAN YUSOFF (STU260419, Balmoral) to FARHAN SHAIKH (STU260528, Kembangan). The match is saved as a staff override so it never auto-matches back.
2. **Clean Lana's profile:** Duplicate invoice INV-2026-00425 is deleted along with its items. INV-2026-00384 is re-assigned to Farhan Shaikh instead of being deleted, so the original invoice number from 01/08/2026 is kept. Lana keeps no invoices, payments, credits or change-log entries from this order.
3. **Farhan's record:** INV-2026-00384 moves to Farhan's Kembangan account and gets one verified PayNow payment of S$284.30, linked to the original proof image and dated 23/07/2026. The invoice then works out to Paid & Verified, balance S$0.00, with the payment shown.
4. **Audit note:** A change-log entry on both students records the correction.

## Checks after the fix
- Lana's profile shows no guards invoices.
- Farhan's profile shows one paid invoice with one payment and the proof attached.
- The Guards tab shows the order under Farhan, still collected.
- No credits were created for either student.

## Technical details
- One-off data correction via SQL (look up ids first): update `guards_purchases.matched_student_id` / `student_id`, write a `submission_match_overrides` row, update `invoices.student_id` and `branch_id` for 00384 (keeping the SG country template), delete `invoice_items` and the invoice row for 00425, insert a `payments` row (status verified, method paynow, proof path), and let `recalc_invoice_from_payments` set totals.
- Look for any entitlements or credits tied to 00425 and remove them.
- Out of scope: tightening the name matcher so "FARHAN" alone can't match. I can do that next if you'd like.
