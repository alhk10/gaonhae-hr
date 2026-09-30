# Show "Cancelled & Refunded" on the Competitions list

When a competition submission's payment has been refunded as credit, the row currently still shows "Paid & Verified". Update the /access Competitions list so refunded rows are clearly marked.

## What changes

1. **Status derivation** (`get_public_competition_list` RPC, one migration)
   - When the submission is verified but its linked invoice is `cancelled` (refunded as credit), return paid_status `cancelled_refunded` instead of `paid`.
   - No rows are hidden; refunded rows stay visible in the list.

2. **Status badge** (`src/components/grading-list/StatusBadge.tsx`)
   - Add a new canonical status `cancelled_refunded` with label **"Cancelled & Refunded"**, styled grey (same family as Cancelled).

3. **Competitions tab** (`src/pages/public/PublicGradingList.tsx`)
   - The payment-status filter gains a "Cancelled & Refunded" option so staff can list just those rows.
   - Refunded rows are excluded from the "Paid" filter and no longer count as paid in the list.

## Notes

- Scoped to the Competitions tab as shown in the screenshot; the new badge status is available to the other tabs if needed later.
- No change to the refund flow itself, the public /comps form, or /hello.
- Verification: typecheck + build, then a Playwright check that a refunded submission (e.g. a test refund) shows the new badge and appears under the new filter.
