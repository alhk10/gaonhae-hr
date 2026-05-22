# Grading step: Foundation multi-select + auto add on Continue

Refines the Grading step of `/hello` (`PublicHelloChat.tsx`) for Singapore Foundation students. No DB or RPC changes — frontend only.

## Behaviour changes

1. **Foundation 1/2/3 checkboxes (SG only)**
   - Visible only when `branch.country === 'Singapore'` AND `matched.current_belt` is one of `Foundation 1 / Foundation 2 / Foundation 3`.
   - Rendered inside the grading card, **below the `$90.00` price line** and **above** (the now-removed) Add to cart button.
   - Three checkboxes labelled "Foundation 1", "Foundation 2", "Foundation 3".
   - Pre-checked: the student's current Foundation level (e.g. current belt = Foundation 2 → "Foundation 2" pre-checked, disabled so it can't be unchecked — it represents the next grading attempt that must happen).
   - Higher levels (Foundation 3 if current is Foundation 1 or 2; etc.) are optional — student ticks to combine multiple Foundation gradings in one event.
   - Cannot tick a level *lower* than the current belt (disabled).
   - Each ticked level resolves to its matching grading product via existing name pattern (`Foundation 1 >> Foundation 2`, etc.) from the products list. Cart line = one product per ticked level, each priced from its own product record.

2. **Grading slot dropdown placement**
   - Move the Grading Slot `Select` so it renders **below** the Foundation checkboxes (SG) / below the price (non-SG), and **above** the Continue button.
   - Slot eligibility query already filters by belt/age; expand `activeGradingProduct` input list to include all currently-ticked Foundation products so slots eligible for the combined set are returned.

3. **Remove "Add to cart" button — auto-add on Continue**
   - Drop the per-product `Add to cart` button inside `ProductRow` for the grading flow.
   - On `Continue` click in the grading step:
     - Validate: at least one Foundation level ticked (SG) / grading product available (non-SG), and a grading slot picked.
     - Build cart items from the ticked products (or the single default product for non-SG) with the selected `gradingSlotId`, then proceed to `payment_pay`.
   - Preorder dialog logic kept: if any ticked product `isPreorderProduct(p)` is true, show the existing `AlertDialog` first; on confirm, commit all items and advance.
   - Cart preview block ("Your cart" subtotal) still renders so the user sees the combined total before paying.

4. **Continue button enablement**
   - Disabled until: ≥1 Foundation level selected (SG) AND grading slot selected (when slots exist).
   - "No eligible grading slots available right now." helper text preserved.

## Out of scope

- Non-grading categories (School Fees, Uniforms) keep their existing per-row Add to cart button.
- No changes to RPCs, `submit_public_chat_invoice`, services, or DB.

## Technical notes

- New local state: `selectedFoundationLevels: Set<string>` initialised from `matched.current_belt`.
- Helper: `getFoundationProduct(level: 'Foundation 1' | 'Foundation 2' | 'Foundation 3', products)` matches a product whose name starts with `<level> >>`.
- `gradingSlots` query key extended with the sorted list of ticked product ids; `getPublicGradingSlots` already accepts a product id array.
- On Continue: iterate ticked levels in order, call existing `commitCartItem` for each (skipping preorder dialog detour or routing through it once with all pending items if any are preorder).
