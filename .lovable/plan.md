

## Multi-Select Terms in Create Invoice Dialog

### Overview
Change the term selector in the Create Invoice dialog from a single-select dropdown to a multi-select, allowing admins to select multiple terms at once. Each selected term will display its own ClassScheduleSelector grid, so class slots can be picked across multiple terms.

### Changes

**File: `src/components/sales/CreateInvoiceDialog.tsx`**

1. **Replace single `term_id` with `selectedTermIds: string[]`**
   - Change `newItem.term_id` (string) to a new state `selectedTermIds` (string array)
   - Remove `term_id` from the `newItem` state object
   - Update all reset logic (branch change, student change, category change) to clear `selectedTermIds`

2. **Replace the term `<Select>` dropdown with a multi-select using checkboxes**
   - Use a `Popover` with `Command` (similar to existing searchable select patterns) showing checkboxes for each term
   - Display selected term count or names in the trigger button
   - Toggling a term adds/removes it from `selectedTermIds`

3. **Render one ClassScheduleSelector per selected term**
   - In the class schedule section (lines 1134-1146), loop over `selectedTermIds` and render a `ClassScheduleSelector` for each, with term name as a heading
   - All selectors share the same `selectedClassSlots` state (slots from different terms are distinguishable by date)

4. **Update `addItem` to store all selected terms**
   - Store `term_ids: string[]` and `term_names: string[]` in the invoice item metadata instead of single `term_id`
   - Update the `InvoiceItem` interface: replace `term_id?: string` and `term_name?: string` with `term_ids?: string[]` and `term_names?: string[]`
   - Update validation to check at least one term is selected
   - Update the metadata stored in `invoice_items` table to include `term_ids` array

5. **Update the items table display**
   - In the items table where term name is displayed, show comma-separated term names or a count badge

6. **Update auto-select logic**
   - Auto-select the current/next term by default (same as before, but as a single-element array)
   - Remove auto-select-if-only-1 effect since multi-select behavior is different

### Technical Details

- The `ClassScheduleSelector` component remains unchanged -- it accepts a single `term` prop, so we render one instance per selected term
- Selected class slots across terms are stored in a single `selectedClassSlots` array (each slot includes the date, so they are unique across terms)
- The metadata in `invoice_items` will contain `{ term_ids: [...], selected_class_slots: [...] }` instead of `{ term_id: "..." }`
- The multi-select UI will use a `Popover` + `Command` pattern with checkboxes, consistent with existing patterns in the app
- No database migration needed -- metadata is JSONB

### UI Flow
1. Admin selects Branch and Student, picks "Classes" category
2. Term column shows a multi-select button (e.g., "2 terms selected")
3. Clicking opens a popover with checkboxes for each available term
4. Below the items table, one ClassScheduleSelector grid appears per selected term, each with a term heading
5. Admin selects slots across terms, then clicks "+" to add the item

