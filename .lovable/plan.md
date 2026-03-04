

## Plan: Invoice Edit Mode Enhancements

### Problem
1. **Status field** is directly editable in edit mode — it should be read-only and driven only by payment recordings (including partial payment status)
2. **Items tab** is read-only in edit mode — users need to add, remove, and change products
3. **Lessons/class slots** need to be editable for all class items, not just existing ones

### Changes

All changes are in **`src/components/sales/ViewEditInvoiceDialog.tsx`**:

#### 1. Remove Status Dropdown from Edit Mode
- Remove the `<Select>` for status (lines 495-513) entirely
- Display status as a read-only badge in both view and edit modes
- Remove `status` from `editData` state since it's no longer user-editable
- Remove the status update logic from `handleSave`
- Add `partial` and `verified` to `getStatusBadgeVariant` and `getDisplayStatus` for proper rendering

#### 2. Add Item Editing Capabilities to Items Tab
- Add state for editable items (`editItems`) initialized from `invoice.items` when entering edit mode
- Load products list (from `getProducts`) and categories when dialog opens
- In edit mode, render each item row with:
  - Product selector (searchable dropdown, reusing the pattern from CreateInvoiceDialog)
  - Editable quantity input
  - Editable unit price input
  - Remove button (trash icon)
- Add an "Add Item" button below the items table
- When a product is selected, auto-populate name, description, and unit price
- Recalculate subtotal/tax/total dynamically from edited items

#### 3. Enable Class Slot Selection for New/Changed Items
- When a product belongs to the "Classes" category, show the `ClassScheduleSelector` component
- Reuse existing term-loading and age-calculation logic already in the component
- Allow selecting/changing terms and class slots for any class-type item

#### 4. Update Save Logic
- On save, sync edited items back to `invoice_items` table:
  - Delete removed items
  - Update changed items (product, quantity, price, metadata)
  - Insert new items
- Recalculate and update invoice totals (subtotal, tax, total, balance_due)
- The invoice status remains unchanged — only payment recordings affect it

### Technical Details

- Products will be fetched using `getProducts()` from `productService`
- Tax calculations will follow the existing pattern using `COUNTRY_TAX_RATES` from constants
- Item metadata (class slots, term info) will be preserved/updated during edits
- The `handleSave` function will perform a transactional update: delete removed items, upsert changed/new items, then update the invoice totals

