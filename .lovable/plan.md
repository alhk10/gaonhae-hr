## Goal
Let superadmins add a new product directly from the Create Invoice dialog on the branch dashboard. Non-superadmin users see no such option.

## Changes (frontend only)

**src/components/sales/InvoiceDialog.tsx**
1. Import `AddProductDialog` and `useAuth`.
2. Read `userrole` from `useAuth`; compute `isSuperadmin = userrole === 'superadmin'`.
3. Pass an optional `onAddProduct` render prop / superadmin flag into `ProductSearchSelect` (only when `isSuperadmin && isCreateMode`).
4. In `ProductSearchSelect`, when the flag is set, render an "+ Add new product" row at the bottom of the `CommandList` (inside a separate `CommandGroup`). Clicking it:
   - Closes the popover.
   - Opens `AddProductDialog` via a hidden trigger (state-driven `open`), or by rendering `<AddProductDialog trigger={...}/>` where the trigger is the command row.
5. On `onProductAdded`, call `loadProducts()` (passed down as `onProductCreated` callback) so the newly created product appears in the list. Auto-select the new product if its id is returned (optional; keep simple — just refresh list and let user pick).

## Access control
- Only `userrole === 'superadmin'` sees the "Add new product" row.
- No backend/RLS changes — product creation already exists via `AddProductDialog` and is governed by existing product policies.

## Out of scope
- No changes to edit/view mode.
- No changes to product service, schema, or permissions.
- No changes to other invoice flows.
