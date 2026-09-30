# Fix Evan Shah refund status and invoice PDF layout

## What we found
- **Evan's invoice (INV-202609-0431):** both lines were refunded as credit ($130.80 + $109.00 = $239.80, approved 30/09). But the invoice status was never changed. It still says "verified", so the Competitions list shows Paid & Verified.
- **Refund math leaves leftovers:** after the refunds the invoice shows total $0 and subtotal $0, but GST still says $19.80. The refund only takes away the line's own GST figure, which is $0 on these GST-inclusive lines.
- **PDF header:** when no letterhead text is set, the company name and address start at the left edge, which is under the logo. That's why "GAONHAE TAEKWONDO LLP" overlaps the logo in your screenshot.

## Changes
1. **Refunding every line cancels the invoice.** When the last line is refunded, the invoice becomes "cancelled" with GST $0. A partly refunded invoice keeps its status. GST is recalculated from the lines still left, not just subtracted.
2. **Competitions badge.** A competition shows "Cancelled & Refunded" when its invoice is cancelled, or when every line has been refunded. This covers older invoices too.
3. **Fix existing data.** Evan's invoice becomes cancelled with GST $0. Any other invoice where every line was refunded but the status wasn't changed gets the same fix. No credit amounts are touched.
4. **PDF header.** The company name, address and UEN move to the right of the logo, so nothing overlaps.
5. **PDF refunded lines.** Refunded lines show crossed out with a "Refunded" label. The totals show Subtotal, GST, Refunded as credit and Total. Cancelled invoices show the grey "Cancelled" label.

## Technical details
- `src/services/invoiceRefundService.ts`: after marking an item refunded, reload the remaining non-refunded items. Recompute subtotal/tax/total from them using the branch GST rule. If none are left, set `status='cancelled'` and zero the totals.
- Migration: update `get_public_competition_list` so it returns `cancelled_refunded` when `i.status='cancelled'`, or when the invoice has items and every item has `metadata->>'refunded'='true'`.
- Data fix via SQL: set `status='cancelled'` and `tax_amount=0` on invoices where every item is refunded (Evan included).
- `src/utils/invoicePDFGenerator.ts`: in the default header, use `textStartX` instead of `margin`. In the items and totals sections, cross out refunded items and add a refunded-credit line.
- Check: create Evan's PDF with a script, turn it into an image and look at it. Confirm his row shows Cancelled & Refunded on /access Competitions.
