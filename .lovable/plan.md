

## Plan: Add category filter next to product search

In **Settings → Branches → Branch Setup → Products & Pricing**, add a category dropdown beside the existing search field so staff can narrow the long product list (Adidas gear, Lessons, Grading, etc.) before editing branch prices/visibility.

### Changes

**File: `src/components/settings/branch-setup/ProductsPricingTab.tsx`**

1. **Fetch category on each product row.** Update the `load()` query from `select('id, name, sku, base_price')` to `select('id, name, sku, base_price, category_id, product_categories(name)')` and store `category_id` + `category_name` on `ProductRow`.

2. **Load categories.** In the same `load()` (or a parallel call), fetch `product_categories` where `is_active = true`, ordered by `name`. Store as `categories` state `{ id, name }[]`.

3. **Add category state.** New `const [categoryFilter, setCategoryFilter] = useState<string>('all')`.

4. **Add Select dropdown** (using existing `@/components/ui/select`) to the right of the search input on the same flex row:
   - "All categories" (value `all`) + one option per category.
   - Trigger styled `h-9 w-[200px]` to visually match the search input height.
   - Layout: wrap the existing search `div` and the new Select in a `flex flex-wrap items-center gap-2` row so they stack on mobile.

5. **Extend `filtered` memo** to also filter by `categoryFilter` when not `'all'` (`r.category_id === categoryFilter`), in addition to the existing name/SKU search.

6. **Empty-state copy** stays the same ("No products match your search.") since it covers both filters.

### Out of scope

- Showing the category as a new column in the table.
- Multi-select categories.
- Persisting the filter across dialog reopens.

