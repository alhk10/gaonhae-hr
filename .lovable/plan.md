
## Show and Edit Class Dates in View Invoice Dialog

### Overview
Display the selected class dates from invoice item metadata below the "3x Weekend" item row in the Items tab. In edit mode, allow adding/removing dates using the ClassScheduleSelector component.

### Changes

**File: `src/components/sales/ViewEditInvoiceDialog.tsx`**

1. **Import ClassScheduleSelector and date-fns utilities**
   - Import `ClassScheduleSelector` from `@/components/dashboard/ClassScheduleSelector`
   - Import `format, parseISO` from `date-fns`

2. **Add state for editing class slots**
   - `editingClassSlots`: `Record<string, string[]>` keyed by item ID, storing the editable slots per item
   - Initialize from item metadata when entering edit mode

3. **Display class dates below item rows (view mode)**
   - After each item row in the Items table, check if `item.metadata?.selected_class_slots` exists
   - If yes, render an additional row spanning all columns showing the dates as a list of badges or formatted date chips (e.g., "Mon 3 Jan", "Mon 10 Jan", etc.)
   - Group dates by week or show as a simple comma-separated list

4. **Show ClassScheduleSelector in edit mode**
   - When in edit mode and an item has class slots, render the `ClassScheduleSelector` below the item row
   - Need to fetch the term from `item.metadata.term_id` to pass to the selector
   - Need to calculate student age from invoice student data (fetch `date_of_birth`)
   - The selector allows toggling slots on/off

5. **Save updated class slots**
   - In `handleSave`, update `invoice_items.metadata` with the modified `selected_class_slots` for each edited item
   - Use direct Supabase update on `invoice_items` table

6. **Fetch student DOB and term data**
   - Load student `date_of_birth` when invoice loads (for age calculation)
   - Load term data from `term_calendar` when an item has a `term_id` in metadata

### Technical Details

- Class slot format: `"timetableId_YYYY-MM-DD"` -- extract the date portion for display
- In view mode, parse each slot string, extract the date, format it nicely, and display as small badges below the item description
- In edit mode, render the full `ClassScheduleSelector` grid for the term, pre-populated with existing selections
- The `ClassScheduleSelector` requires: `branchId` (from invoice), `studentAge` (from student DOB), `selectedSlots`, `onSlotsChange`, `term` (from metadata term_id)
- Metadata update: `supabase.from('invoice_items').update({ metadata: { ...existing, selected_class_slots: newSlots } }).eq('id', itemId)`
- No database migration needed -- metadata is already JSONB

### UI Layout (Items tab)
```text
| Description     | Qty | Unit Price | Tax    | Total    |
|-----------------|-----|------------|--------|----------|
| 3x Weekend      | 7   | $25.00     | $15.75 | $190.75  |
| Selected Dates: Mon 6 Jan, Mon 13 Jan, Mon 20 Jan...    |
|                                                          |
| [ClassScheduleSelector grid - only in edit mode]         |
```
