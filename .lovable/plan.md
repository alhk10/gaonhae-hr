

## UI Adjustments to Grading Opt-In Section in Pay School Fees

### Changes

#### 1. Move grading section above the payment summary
Currently the order is: Summary Card → Grading Opt-In → Payment Section. 
Reorder to: **Grading Opt-In → Summary Card → Payment Section**.
This means lines 711-758 (grading opt-in block) will be moved before lines 668-709 (summary block).

#### 2. Update the opt-in text
Change `"Also register for grading"` to `"Your child is ready for the grading, would you like to pay for it together?"`.

#### 3. Show slot title in dropdown instead of "Select Grading Session"
Change the `<Label>` from `"Select Grading Session *"` to display each slot's `title` field in the dropdown items, and use the slot title as the dropdown label if available. The `<SelectItem>` entries already show date/time — they will also include the slot title (e.g., "Foundation 1-2 Grading — Sunday, 29 Mar 2026 at 10:35").

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | Reorder the grading opt-in block to appear before the summary card; update label text; show slot title in dropdown |

