# Sponsored (100% discount) invoices — status handling

Edith's invoice INV-2026-00430 is fully discounted (100% off both items), so the total is $0.00 — but it was saved as **draft** and displays as "Unpaid". That is misleading: there is nothing to collect, and a draft/unpaid status can block things that require a paid term invoice (e.g. grading) and keeps the invoice in outstanding-balance lists.

## Recommended status: Paid & Verified

For a $0 invoice there is no money to receive and nothing for staff to verify, so the invoice should go straight to **Paid & Verified** (green) — settled, with a note that it is a sponsored/complimentary invoice.

## Changes

1. **Invoice creation** (`src/services/invoiceService.ts`): when the computed total is $0 (full discount), save the invoice with status `verified` instead of `draft`, and add an internal note "Sponsored — 100% discount, no payment required". Normal invoices are unchanged (still start as draft).
2. **Fix Edith's existing invoice**: set INV-2026-00430 to `verified` (it has no payments and a $0 balance, so this is safe).
3. **Display**: no change needed — the shared status badge already renders `verified` as "Paid & Verified".

## Alternative (if you prefer)

If you'd rather sponsored invoices stand out, we could instead show them as **Paid** (green) with a "Sponsored" badge. Paid & Verified is recommended because it keeps grading eligibility and reporting consistent without extra rules.

## Technical notes

- One-line condition in `createInvoice`: `status: totalAmount <= 0 ? 'verified' : 'draft'`.
- Edith's fix is a single data update on `invoices` (id d0fcda10-2d20-4c40-add2-7000104e6d62).
- No schema changes; no effect on invoices with a real amount due.
