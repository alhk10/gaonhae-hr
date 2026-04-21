

## Plan: Fix product availability logic so "1x Week" appears at Morley

### Root cause
In `src/components/sales/InvoiceDialog.tsx` (lines 460–479), branch availability is computed as: a product is available only if it has an active `price_rule` for the branch, OR a global active rule, OR no rules at all. In this database, `price_rules` are used purely as **per-branch price overrides** (262 active rules across SG branches, 0 global rules). Australian branches like Morley never have `price_rules`. Three products ("1x Week" included) have all-inactive rules (used to disable them at SG branches), and our code interprets "has rules but no active match" as "not sold at this branch", so it hides them everywhere — including Morley where they should appear.

### Correct semantics
- `products.is_active` is the master availability switch.
- A `price_rules` row with `is_active = false` for branch X means "explicitly hidden at branch X".
- A `price_rules` row with `is_active = true` for branch X means "sold at branch X with price override" — it does **not** restrict availability elsewhere.
- Default: a product is available at every branch unless explicitly hidden.

### Fix (single file: `src/components/sales/InvoiceDialog.tsx`)

Replace the `branchAvailableProductIds` computation (lines 460–480) with the simpler, correct rule:

```ts
const available = new Set<string>();
for (const p of products) {
  if (hidden.has(p.id)) continue;   // explicit per-branch hide
  available.add(p.id);               // everything else is available
}
setBranchAvailableProductIds(available);
```

This means:
- "1x Week" at Morley → not in `hidden` (no Morley rule) → **available** ✓
- "1x Week" at Balmoral → has `is_active=false` Balmoral rule → **hidden** ✓
- Any other product never restricted at the branch → available ✓
- Existing "out-of-criteria" / `(exception)` sorting and superadmin-approval flow remain unchanged.

The exception-sorting logic (line 757–765) keeps using `branchAvailableProductIds`, so eligible items still surface above out-of-criteria ones.

### What stays the same
- `hiddenProductIds` (explicit hides) still applied.
- Belt / age / class-type / grading-belt filters unchanged.
- Approval workflow for selecting exception items unchanged.
- Edit-mode product popover (line 1656) reuses the same set.

### Verification
- Open Create Invoice → Morley → JIHO SONG → product dropdown contains "1x Week" near the top of `Classes` (no exception flag, since age/belt match).
- Same dialog at a SG branch where "1x Week" has an `is_active=false` rule (Balmoral, Yishun, etc.) → "1x Week" does **not** appear (hidden as intended).
- Other products (e.g. branch-specific term packages) continue to appear at every branch unless explicitly disabled.

### Out of scope
- Migrating price_rules to a positive-availability model.
- Adding a UI to manage per-branch product visibility.

