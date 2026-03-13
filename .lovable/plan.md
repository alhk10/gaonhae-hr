

## Plan: Add Tax Include/Exclude Toggle to Create Invoice Dialog

### Problem
The Create Invoice dialog currently hardcodes tax inclusion based on the branch's country setting. There is no way for the user to override whether tax is included or excluded when creating an invoice. The product-level `tax_included` setting from `price_rules` is also ignored.

### Changes

#### 1. Add tax inclusion toggle to CreateInvoiceDialog.tsx
- Add a state variable `taxIncluded` (boolean), initialized from the branch country default when branch is selected.
- Add a toggle (Switch or Select with "Tax Included" / "Tax Excluded" options) next to the Totals section, visible once a branch is selected.
- Update `getSelectedBranchTaxConfig()` to use this state instead of always reading from country defaults.
- When the branch changes, reset the toggle to the country default.

#### 2. Default from product/branch price_rules settings
- Extend `getBranchPrice()` to also return the `tax_included` field from `price_rules`.
- When the first item is added with a product that has a branch-specific `tax_included` override, use that as the initial default for the invoice-level toggle (only if user hasn't manually changed it).

#### 3. Pass tax inclusion to invoice service
- Add an optional `tax_included` field to `CreateInvoiceData`.
- In `createInvoice()`, use the passed `tax_included` value instead of deriving it from country defaults, falling back to country default if not provided.

#### 4. UI Placement
- Place the toggle in the totals summary area (bottom-right), as a compact dropdown or switch: `Tax: Included ▾` / `Tax: Excluded ▾`, sitting above or beside the Subtotal line.

### Files to modify
- `src/components/sales/CreateInvoiceDialog.tsx` — add state, toggle UI, pass to service
- `src/services/invoiceService.ts` — accept optional `tax_included` in `CreateInvoiceData`

