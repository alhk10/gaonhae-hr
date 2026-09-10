# Sort /hello School Fee product cards

## Goal
Reorder the product cards shown in the `/hello` School Fees step so that:
1. Little Gaonhae packages appear first.
2. Foundation to Red packages appear second.
3. Black Tip & Above packages appear third.

## What will change
- A small shared helper will assign each school-fee product to one of the three groups based on its product name prefix.
- `/hello` will sort the returned products using that helper before rendering the cards, keeping the existing per-group ordering logic intact (e.g. 1x Weekday before 1x Weekend if sorted alphabetically).
- `/fees`, which mirrors the same product list, will use the same ordering for consistency.

## Steps
1. Add `getSchoolFeeProductSortGroup(product)` to `src/utils/schoolFeePlan.ts` with the rules above and a fallback group for any other product.
2. In `src/pages/public/PublicHelloChat.tsx`, memoize `sortedProducts` using the helper and render `sortedProducts.map(...)` instead of `products.map(...)` in the School Fees step.
3. In `src/pages/public/PublicSchoolFeesPayment.tsx`, apply the same sort to the class-package dropdown.
4. Verify the preview shows Little Gaonhae, then Foundation to Red, then Black Tip & Above, and run the build check.
