# Fix Kayden's Unlimited entitlement to match invoice Term 2

## Problem
INV-2026-00249's Unlimited line item is on **Term 2 2026** (28/04/2026 – 03/07/2026, branch BR1768967806476), but its `entitlements` row `cb7fa734-abfa-4a7a-a7e0-b3f12517cd0e` has `valid_from = 2026-07-13` and `valid_to = 2026-09-18` (Term 3 dates). This causes `/hello` to resolve Kayden's term as Term 3 2026 when no Term 3 invoice actually exists.

## Fix (single migration, data-only)
Update the entitlement row to align with the invoice item's Term 2:

```sql
UPDATE public.entitlements
SET valid_from = '2026-04-28',
    valid_to   = '2026-07-03',
    updated_at = now(),
    updated_by = 'system: realign to invoice item term 2'
WHERE id = 'cb7fa734-abfa-4a7a-a7e0-b3f12517cd0e'
  AND source_type = 'invoice_item'
  AND source_id = '91927ac6-7278-49ca-b733-dc1aef2af5a0';
```

Scope:
- Targeted by primary key plus source_id guard — affects exactly one row.
- No schema change, no RPC change, no frontend change.
- `sessions_total`, `sessions_used`, `is_active`, `class_type_scope`, `branch_scope` are untouched.

## Expected result
- `/hello` for Kayden's session resolves to **Term 2 2026** (current term containing today's date if applicable, otherwise the only invoiced term).
- The term switcher (built previously) will show only Term 2 2026 until a real Term 3 invoice is raised.
- Bookings / capacities / context RPCs already accept `p_term_id`, so behaviour stays consistent.

## Out of scope
- No new Term 3 invoice is issued.
- No changes to the entitlement-generation logic in `invoiceService.ts` (the root cause of term-edit drift remains a separate follow-up if you want it patched).
