

## Problem

When clicking the inline "Add Payment" ($ icon) on the Branch Dashboard, the `CreatePaymentDialog` opens and immediately calls `getInvoices(1, 100)` — a heavy query that fetches up to 100 invoices with joins, branch lookups, and currency data. This causes a noticeable delay before the dialog becomes usable, even though we already know which invoice the user wants to pay.

## Solution

Optimize the `CreatePaymentDialog` to skip the full invoice list load when a `preSelectedInvoiceId` is provided. Instead, fetch only the single pre-selected invoice directly from Supabase.

## Changes

### 1. `src/components/sales/CreatePaymentDialog.tsx`

- Add a new `loadSingleInvoice` function that fetches only the pre-selected invoice by ID (single row query with branch country lookup) — much faster than loading 100 invoices.
- Update the `useEffect` on `open` (line 70-74): when `preSelectedInvoiceId` is provided, call `loadSingleInvoice` instead of `loadInvoices`.
- Skip the debounced search `useEffect` (lines 128-135) when `preSelectedInvoiceId` is set and no search is active.
- The invoice items and template fetches (lines 270-302) will trigger immediately once the single invoice is loaded, making the whole flow near-instant.

### Technical Detail

The new `loadSingleInvoice` function will:
```
SELECT *, students(first_name, last_name) FROM invoices WHERE id = preSelectedInvoiceId
```
Then fetch the branch country for that single invoice. This replaces a paginated 100-row query + multiple joins with a single-row lookup.

