# Invoice edit screen: match Create Invoice, fix totals, lock actions by status

## What changes for staff

1. **Same layout as Create Invoice** — editing an existing invoice uses the same compact item rows as creating one: product, term, qty, unit price, discount, line total, and grading/class slot on one tidy row (stacked on mobile), with the same totals box underneath.
2. **Amounts match everywhere** — line totals, subtotal, GST, total, paid and balance calculate the same way as Create Invoice (Singapore 9% / Australia 10% added on top). Example from the screenshot: Blue >> Red Tip $80 becomes $80 + $7.20 GST = $87.20, not "$72.73 + $7.27 incl." The header cards (Total, Balance) show the same numbers as the totals box and update live while editing. Empty item rows (no product) are removed before saving.
3. **Draft invoices can be deleted** — a Delete button shows only on draft invoices with no payments. Deleting runs the existing clean-up (grading, entitlements, enrolments, bookings). No approval needed because nothing has been paid.
4. **Paid & Verified invoices are locked** — no Edit, no Cancel, no Delete. The only action is **Refund as credit** on each line (existing flow; non-superadmins go through superadmin approval). Refunded lines show crossed out with a "Refunded" badge.
5. Unpaid / partially paid invoices keep today's rules (edit, cancel with approval where required).

## Technical details

- `src/components/sales/InvoiceDialog.tsx`
  - Extract the create-mode item row + totals block into a shared renderer and use it for `mode === 'edit'` (replaces the lines ~1825–1975 edit layout).
  - `editTotals`: drop the inclusive branch for new edits; use the create-mode calculation (net lines − discount, tax on top via country rate, total = subtotal + tax). Keep stored inclusive figures only for view-mode display of untouched historical invoices.
  - Header Total/Balance cards read from `editTotals` while editing.
  - Filter out rows with no `product_id` in `handleSave`.
  - Status gating: `isDraftDeletable = status==='draft' && amount_paid===0 && no payments`; hide Edit/Cancel for `verified`; show per-line refund only for `paid`/`verified`.
  - Add Delete confirmation calling the existing deep-deletion service.
- Verify with a test invoice: create vs edit totals identical; draft delete; verified invoice shows only line refunds. No database changes.
