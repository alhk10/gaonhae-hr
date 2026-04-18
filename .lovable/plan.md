

## Plan: Fix dropdown scroll + tighten product filtering by branch & student

### Issues observed in screenshot
1. **Dropdown not scrollable** — the product popover in `Create New Invoice` shows the list extending below the visible area without a working scrollbar. CommandList already has `max-h-[300px] overflow-y-auto`, but inside the dialog (`overflow-y-auto`) the wheel events bubble to the dialog instead of scrolling the dropdown list.
2. **Too many irrelevant products** — for student LUCAS HOANG (Morley, Foundation belt), the dropdown shows every "Black Tip & Above" product flagged `(exception)`. Many of these products are not sold at Morley at all — they're showing because the current filter only hides products with an explicit `price_rules` row marked `is_active=false`. Products with no price_rule at all leak through.
3. **Exception items leak across branches** — the out-of-criteria (red `(exception)`) list should only contain products actually available at the selected branch; right now it's drawn from the full product universe.

### Fix

**1. `src/components/sales/InvoiceDialog.tsx` — Popover/CommandList scroll behavior**
- Bump the inner scroll container so the wheel/touch reliably scrolls the list:
  - Change `<PopoverContent className="w-64 p-0">` to `w-72 p-0 max-h-[60vh] overflow-hidden` and add `onWheel={(e) => e.stopPropagation()}` on `CommandList`.
  - Set `<CommandList className="max-h-[300px] overflow-y-auto overscroll-contain">` so wheel events stay inside the popover instead of being captured by the dialog scroller.
- Apply the same to the edit-mode product popover (line ~1590).

**2. Branch availability filter (relate products to branch)**
- Add a new `branchAvailableProductIds` set, computed once per branch:
  - Source A: products with at least one **active** `price_rules` row for this `branch_id` (branch-specific availability).
  - Source B: products with `branch_id IS NULL` rules (globally available) and **no** inactive override for this branch.
  - Source C: if no price rules exist at all for a product, treat it as globally available (matches today's behaviour for catalogue items without per-branch overrides).
- Replace the current `notHidden = !hiddenProductIds.has(p.id)` check in `filteredProducts` with `availableInBranch = branchAvailableProductIds.has(p.id)`.

**3. Student-relevance ordering inside that branch list**
- Keep `outOfCriteriaProductIds` logic but compute it **only over the branch-available pool**, not over all products. This means:
  - Students see relevant (eligible) products at the top.
  - Exception (red `(exception)`) products only appear if they're actually sold at this branch.
- Sort `filteredProducts` so eligible items come first, then exception items grouped at the bottom (still selectable, still flagged `(exception)`, still triggers superadmin approval flow already in place at line 975-989). No behaviour change for grading category (already filtered by belt transition).

**4. Empty-state messaging**
- If branch+student combination yields zero eligible products and zero exceptions, show a clearer `CommandEmpty`: "No products available for this branch."

### Files touched
- `src/components/sales/InvoiceDialog.tsx` — only file changed.
  - `ProductSearchSelect` component (popover sizing, scroll containment, sort by eligibility).
  - `filteredProducts` memo (branch-availability filter).
  - `outOfCriteriaProductIds` memo (compute against branch pool only).
  - Add a small helper `useBranchAvailableProducts(branchId, products)` that fetches `price_rules` once and returns the allowed set.

### Verification (after default mode applies the changes)
- Open Create Invoice in Morley → student LUCAS HOANG → product dropdown:
  - List scrolls smoothly with mouse wheel and touch inside the popover.
  - Eligible products (Foundation/everyone) appear first; "Black Tip & Above" only appears at the bottom marked `(exception)` and only if Morley actually sells them.
  - Switching to a different branch refreshes the list to that branch's catalogue.
- Existing approval flow (`needsExceptionApproval` for non-superadmins) continues to fire when an `(exception)` item is selected.

### Out of scope
- Changing the underlying `price_rules` data model.
- Changing the (exception) approval threshold or workflow.

