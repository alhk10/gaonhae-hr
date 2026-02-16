

## Add Class Schedule Selection to Create Invoice Dialog

### Overview
When the "Classes" category is selected and a term is chosen, show the `ClassScheduleSelector` component (already used in the Pay School Fees dialog) below the invoice items table. This lets admins pick specific weekly class slots for the student, with the selections stored in invoice item metadata.

### Changes

**File: `src/components/sales/CreateInvoiceDialog.tsx`**

1. **Import ClassScheduleSelector and date utils**: Add imports for `ClassScheduleSelector`, `differenceInYears`, `differenceInMonths`, and `calculateAge` helper.

2. **Add state for selected class slots**: Add `selectedClassSlots` state (`string[]`) to track selected slots in `classId_YYYY-MM-DD` format. Reset when term, branch, or student changes.

3. **Calculate student age**: Add a `studentAge` computation from the selected student's `date_of_birth` (need to fetch DOB from students table -- update `loadStudents` to include `date_of_birth`).

4. **Show ClassScheduleSelector below items table**: When the Classes category is active and a term is selected, render the `ClassScheduleSelector` component between the items table and the totals section. Pass: `branchId`, `studentAge`, `selectedSlots`, `onSlotsChange`, and `term` (the selected term object).

5. **Store slots in invoice item metadata**: When adding the Classes item, include `selected_class_slots` array in the metadata alongside `term_id`.

6. **Update InvoiceItem interface**: Add optional `selected_class_slots: string[]` field.

7. **Reset class slots on context changes**: Clear `selectedClassSlots` when branch, student, term, or category changes.

### Technical Details

- Reuses the existing `ClassScheduleSelector` component from `src/components/dashboard/ClassScheduleSelector.tsx` -- no new components needed
- The selector displays a grid of term weeks (rows) x operating days (columns), with clickable class type buttons per cell
- Student age filtering ensures only age-appropriate classes appear
- Past dates and public holidays are automatically excluded
- Selected slots are stored as `["timetableId_YYYY-MM-DD", ...]` in `invoice_items.metadata.selected_class_slots`
- No database migration needed -- metadata is already a JSONB column
- Students table query updated to include `date_of_birth` for age calculation

### UI Flow
1. Admin selects Branch and Student
2. Selects "Classes" category, picks a product and term
3. The ClassScheduleSelector appears below the items table showing the term weeks grid
4. Admin clicks class slots to select/deselect them
5. Admin clicks "+" to add the item (slots saved in metadata)
6. The selector resets for the next item

