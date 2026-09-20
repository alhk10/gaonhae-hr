# Show Ad-Hoc Lesson in /access school fee settings

## Problem
The "Class availability & pricing" dialog (School Fees tab on /access) never lists **Ad-Hoc Lesson**, so it can't be priced or switched on per branch. The two database functions that feed the settings dialog and the public /fees page both explicitly exclude `Ad-Hoc Lesson` (alongside `Trial Lesson` and `Private Lesson`) by name.

## Fix
1. Update `get_class_products_for_branch_admin` (feeds the settings dialog): remove `Ad-Hoc Lesson` from the name exclusion so it appears as a row with its own price and Available toggle. `Trial Lesson` and `Private Lesson` stay excluded.
2. Update `get_public_class_products` (feeds the public /fees page): same exclusion removed, so Ad-Hoc Lesson shows on /fees only for branches where staff switch it on — same per-branch behaviour as every other class.

No UI changes needed: the existing dialog row, price field, and toggle work as-is once the function returns the product. The /fees page already hides lessons-per-week/day details for ad-hoc products.

## Technical details
- Migration edits two SECURITY DEFINER SQL functions: remove `'Ad-Hoc Lesson'` from the `p.name NOT IN (...)` filter in each.
- Ad-Hoc Lesson then behaves like any other class product: hidden until a branch activates it via the toggle, optional per-branch weekly price override stored in `price_rules`.
- No frontend file changes.
