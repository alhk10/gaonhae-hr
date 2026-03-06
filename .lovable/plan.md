

## Plan: Add Ad-Hoc (Once-Off) Lesson Configuration

### Context
Currently, the Lesson Configuration section only supports recurring weekly lessons (with lessons_per_week, available days, and class types). The user wants an "ad-hoc" or "once-off" lesson type where students can book individual sessions without a fixed weekly schedule.

### Database Change
Add a new column `is_adhoc_lesson` (boolean, default false) to the `products` table via migration. This distinguishes recurring lessons from one-off bookable lessons.

### UI Changes (both AddProductDialog and EditProductDialog)
When `is_lesson` is toggled on, show a lesson type selector:
- **Recurring** (current behavior): shows lessons_per_week, available days, and class types
- **Ad-Hoc / Once-Off**: hides lessons_per_week and available days (not applicable), shows only allowed class types selection

The toggle can be a simple radio group or segmented control under the "This is a lesson product" switch.

### Files to Modify

1. **New migration**: Add `is_adhoc_lesson boolean default false` to `products` table
2. **`src/integrations/supabase/types.ts`**: Add `is_adhoc_lesson` field to products Row/Insert/Update types
3. **`src/services/productService.ts`**: Add `is_adhoc_lesson` to the `Product` interface, `transformProduct`, `createProduct`, and `updateProduct`
4. **`src/components/sales/AddProductDialog.tsx`**: Add ad-hoc toggle in lesson config section; conditionally show/hide recurring fields
5. **`src/components/sales/EditProductDialog.tsx`**: Same UI changes as AddProductDialog

### Behavior
- When "Ad-Hoc" is selected: only class type checkboxes are shown (no weekly schedule fields)
- When "Recurring" is selected: current behavior (lessons_per_week, days, class types)
- `is_adhoc_lesson` is stored on the product and can be used downstream to differentiate booking/enrollment flows

