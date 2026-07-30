## Goal

On `/fees`, the Class dropdown should list only the class products that are actually offered at the selected branch, using the branch-specific price.

## Current behaviour (verified)

`get_public_class_products(p_branch_id)` returns **all 20** active products in the Classes category (minus Trial/Ad-Hoc/Private) for every branch, and LEFT JOINs `price_rules` only to override the price. Products with no branch rule still appear at base price.

Branch coverage today (active class price rules):
- balmoral 16, bukit-merah 15, jurong-west 15, kembangan 15, yishun 15, BR1768967806476 3
- headquarters and the two BR17690142… branches: 0

## Change

**Migration — replace `get_public_class_products`:**
- Change the `LEFT JOIN price_rules` to an `INNER JOIN` on `product_id = p.id AND branch_id = p_branch_id AND is_active = true`, so products without a branch price rule are hidden.
- Also respect rule date windows: `(effective_from IS NULL OR effective_from <= current_date) AND (effective_to IS NULL OR effective_to >= current_date)`.
- Price returned = `pr.price_override`, falling back to `p.base_price` when the rule has no override (e.g. rules that only set a discount %).
- Keep the existing category filter, `is_active`, name exclusions, and name ordering.
- If a branch has more than one matching rule for a product, pick one deterministically (`DISTINCT ON (p.id)` ordered by most specific/most recent rule) so no duplicate dropdown rows.

**Frontend:** no change required — `PublicSchoolFeesPayment.tsx` already builds each label from `product_name` + `branch_price` (× term weeks), and already shows "No classes are configured for this branch" when the list comes back empty.

## Note

Branches with no class price rules (headquarters and the two new BR… branches) will now show the empty-state message instead of base-price classes. Price rules need to be added in Products & Services for those branches to appear.
