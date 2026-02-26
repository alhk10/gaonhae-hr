

## Plan: Add Branch-Specific Pricing to CSV Export/Import

### Approach
Add dynamic branch columns to the CSV so each branch gets its own price column (e.g., `price_Jurong West`, `price_Bishan`). On import, parse these columns and create/update `price_rules` entries accordingly.

### Changes

**`src/components/sales/ProductManagementList.tsx`** — Update `handleExportCSV` and `handleDownloadTemplate`:

1. **Export**: After fetching products, also fetch all branches and all `price_rules`. For each product row, append branch-specific price columns (`price_<BranchName>`) after the base columns. If a price rule exists for that product+branch, output the `price_override`; otherwise leave blank.

2. **Template**: Fetch branches and append `price_<BranchName>` columns to the header row, with example values in the sample row.

**`src/components/sales/ImportProductsDialog.tsx`** — Update parsing and import logic:

1. **Header detection**: After validating the base 11 expected headers, detect any additional columns matching `price_*` pattern — extract branch names from them.

2. **Validation**: For each `price_<BranchName>` column with a value, validate it's a valid number and that the branch name maps to an existing branch.

3. **Import**: After inserting products, for each successfully inserted product, create `price_rules` entries for any branch columns that had values — using `upsertBranchPrice` or direct insert into `price_rules`.

4. **Preview table**: Show a summary indicator if branch pricing is present (e.g., badge showing "3 branch prices").

