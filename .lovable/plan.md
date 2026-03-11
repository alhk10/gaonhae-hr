

## Plan: Show "Grading Registered" Card When Grading is Already Paid

### Problem
When a student has already paid for grading, the "Pay Grading" card with "Select Grading Session" button still shows. Instead, it should display a confirmation card with the registered slot details.

### Approach

**File: `src/components/dashboard/QuickActionsSection.tsx`**

1. Add a new query to fetch the student's **paid grading registration** — a `grading_registrations` record where `ready_for_grading = true` AND `invoice_item_id IS NOT NULL` (meaning paid), joined with `grading_slots` to get slot details (date, time, location, title).

2. Replace the grading card logic:
   - If a **paid registration** exists → show a green "Grading Registered" card with:
     - A checkmark icon (green theme instead of purple)
     - Title: "Grading Registered ✓"
     - Slot details: date (formatted), time, location/title
     - Belt transition text: "Current Belt → Target Belt"
   - If **not paid but ready** (current `canPayGrading` logic) → show the existing "Pay Grading" card as-is

3. The query will select from `grading_registrations` joined with `grading_slots` on `grading_slot_id`, filtering by `student_id`, `ready_for_grading = true`, and `invoice_item_id IS NOT NULL`.

### Technical Details

- Query: `supabase.from('grading_registrations').select('id, current_belt, target_belt, grading_slot_id, grading_slots(grading_date, start_time, end_time, location, title)').eq('student_id', student.id).eq('ready_for_grading', true).not('invoice_item_id', 'is', null).limit(1).maybeSingle()`
- Display the slot date formatted as "dd MMM yyyy", time as "HH:mm", and location if available
- Use `CheckCircle` icon with green styling to indicate successful registration
- Card is non-interactive (no button needed)

