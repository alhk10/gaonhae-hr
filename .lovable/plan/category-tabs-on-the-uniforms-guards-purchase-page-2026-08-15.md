# Category tabs on the Uniforms & Guards purchase page

Split the single long "Items" list on `/guards` into tabs, one per product category, so buyers can jump straight to Uniforms or Guards instead of scrolling.

## What changes

- The Items field becomes a tabbed control. Tabs are built from the categories of the items available for the selected branch:
  - **Packages** — the bundle items (Gaonhae Protection Guard Set, Preorder - Adidas Chest Guard + Head Gear Set).
  - **Uniforms** — products in "Uniforms & Apparels".
  - **Guards** — products in "Protection Guards & Accessories".
  - Any other category configured for the branch gets its own tab automatically.
- Only tabs with at least one available item are shown; if a branch has just one group, the tabs are hidden and the plain list is shown as today.
- A small count badge on each tab shows how many items in that tab are currently selected, so selections made on other tabs stay visible.
- Selection state, quantity inputs, gender/size prompts, the running total, GST, proof upload and submission are unchanged — the cart spans all tabs.
- Tabs are scrollable horizontally on mobile to fit the narrow layout.

## Technical detail

- Migration: update `get_public_guards_products(p_branch_id)` to also return `category_name` (product category for individual products, literal `Packages` for the two package rows). No table changes.
- `src/services/guardsPurchaseService.ts`: add `category_name: string` to `GuardsBranchItem` and pass it through in the mapper.
- `src/pages/public/PublicGuardsPurchase.tsx`: group `products` by `category_name` (Packages first, then alphabetical), render with shadcn `Tabs`/`TabsList`/`TabsContent`, keep the existing item row markup inside each `TabsContent`, and default the active tab to the first non-empty group.
