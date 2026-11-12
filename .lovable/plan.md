# Fix missing products when paging the Products list

## Cause
The list fetches 20 products per page first, then hides inactive ones (the default "Active" filter) and branch-hidden ones afterwards. So page 1 showed only 6 of its 20, the count still said 24, and active products on other pages were skipped or shown out of place.

## Fix
- Apply the Active/Inactive filter in the database query itself, before paging, so each page holds 20 matching products and the count is correct.
- Apply the branch filter the same way (exclude products hidden for that branch inside the query), so "Page X of Y" matches what you see.
- Jumping filters resets to page 1 (already the case).

## Technical details
- `getProducts` in `src/services/productService.ts`: add optional `status` (`is_active` eq) and `excludeIds` (`not in`) parameters.
- `ProductManagementList.tsx` `loadProducts`: load hidden ids for the branch first, pass both to `getProducts`, remove the client-side filtering; also avoid the double load on filter change.
- Check in the browser: Protection Guards & Accessories, Next page shows the remaining active products and the total matches.
