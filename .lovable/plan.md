# School Fees — Class availability & pricing settings

Add a gear button to the right of the status filter in the School Fees tab of `/access`. It opens a dialog where staff pick a branch and control, per class product: whether it is offered at that branch and what the weekly price is. This drives exactly what the public `/fees` page lists (which reads `get_public_class_products`).

## UI

`src/components/grading-list/SchoolFeesTab.tsx`
- Add a `Settings` icon button (h-8, outline) immediately right of the status `Select`, shown only when `canEdit` is true (same password gate as verify/reject).
- Opens new `SchoolFeeProductSettingsDialog`.

New `src/components/grading-list/SchoolFeeProductSettingsDialog.tsx`
- Branch dropdown at top (loaded from branches; uses the same text branch id used by `price_rules`, e.g. `balmoral`).
- Table of all active class-category products (excluding Trial / Ad-Hoc / Private Lesson):
  - Product name + base price (read-only)
  - "Available" switch → toggles the branch price rule active/inactive
  - "Branch price /wk" numeric input → `price_override` (blank = fall back to base price)
- Inline dirty-row tracking with a single Save button; toast on success; invalidates the `/fees` product query key.
- Compact styling consistent with existing dialogs (h-7 inputs, text-xs, `max-w-[95vw]`).

## Backend (migration)

Because `/access` runs unauthenticated, add two `SECURITY DEFINER` RPCs granted to `anon, authenticated`:

1. `get_class_products_for_branch_admin(p_branch_id text)` — returns every active class product with `product_id, product_name, base_price, rule_id, price_override, is_available` via `LEFT JOIN price_rules` on that branch (no inner join, so unavailable products still appear).
2. `admin_set_class_product_branch_pricing(p_branch_id text, p_product_id uuid, p_available boolean, p_price_override numeric, p_actor text)` — upserts the branch price rule (`rule_name` defaults to `<branch> class pricing`), sets `is_active = p_available`, `price_override`, `updated_by`, `updated_at`.

Both leave `get_public_class_products` unchanged, so the public `/fees` list automatically reflects edits.

## Service

`src/services/schoolFeesSubmissionService.ts` — add `getClassProductsForBranchAdmin()` and `setClassProductBranchPricing()` wrappers plus a `BranchClassProduct` type.

## Notes

- Pricing edited here is the weekly rate; `/fees` continues to multiply by term weeks.
- Deactivating a rule hides the class from `/fees` for that branch but does not touch existing invoices.
