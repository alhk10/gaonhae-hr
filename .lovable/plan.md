

# Add "My Class Schedule" Tab to Student Portal

## Overview
Replace the existing "Class Schedule" tab (which shows the generic branch timetable) with a new "My Class Schedule" tab that displays only the student's invoiced/enrolled classes, with attendance status indicators and reschedule/make-up functionality.

## What the Student Will See

### My Class Schedule Tab
- A list of all scheduled classes from `student_scheduled_classes` linked through `student_class_enrollments` for the logged-in student
- Each class row shows:
  - Date and day of week
  - Class type (e.g., "Weekend", "Weekday")
  - Time slot (start time)
  - Attendance status: a green checkmark if attended, red X if absent, or "Scheduled" badge if upcoming
  - For past classes marked as absent or upcoming scheduled classes: a "Reschedule" button
  - For missed classes with no make-up yet: a "Make Up" button
- Filter options: "Upcoming", "Past", "All"
- Grouped by term name for clarity

### Reschedule / Make Up Dialog
- A dialog that opens when clicking "Reschedule" or "Make Up"
- Shows available class slots from the branch timetable for the same class type
- Student selects a new date from available upcoming slots
- Optionally enters a reason
- Submits a swap request using the existing `swapScheduledClass` function from `classEnrollmentService.ts`

## Technical Details

### Files to Create
1. **`src/components/dashboard/StudentMyClassSchedule.tsx`** - New component replacing `StudentClassSchedule` in the student portal tab
   - Fetches `student_class_enrollments` for the student (active status)
   - Fetches `student_scheduled_classes` for those enrollment IDs
   - Fetches `term_calendars` for term names
   - Displays classes in a card list grouped by term
   - Each row shows date, class type, time, attendance checkmark/X, and action buttons
   - Uses `useIsMobile` for responsive layout

2. **`src/components/dashboard/RescheduleClassDialog.tsx`** - Dialog for rescheduling/make-up
   - Accepts the scheduled class to reschedule and the branch timetable
   - Shows a date picker filtered to valid future dates matching the class type's weekday slots
   - Shows available time slots for the selected date
   - Reason text field
   - Calls `swapScheduledClass()` on submit
   - Invalidates queries on success

### Files to Modify
1. **`src/components/dashboard/StudentDashboard.tsx`**
   - Import `StudentMyClassSchedule` instead of (or alongside) `StudentClassSchedule`
   - Rename the tab from "Class Schedule" / "Schedule" to "My Classes" 
   - Render `StudentMyClassSchedule` in the "schedule" tab content

### Data Flow
- `student_class_enrollments` (student_id, status=active) provides enrollment IDs and class_type
- `student_scheduled_classes` (enrollment_id) provides individual class dates, times, and attendance status
- `term_calendars` (via enrollment.term_id) provides term name for grouping
- `branch_timetables` provides available slots for rescheduling
- `swapScheduledClass()` from `classEnrollmentService.ts` handles the actual reschedule by marking the original class as "swapped" and creating a new scheduled class

### Attendance Status Display
- `status === 'attended'` -- Green check icon
- `status === 'absent'` -- Red X icon  
- `status === 'scheduled'` -- Gray clock/calendar badge (upcoming)
- `status === 'swapped'` -- Orange swap icon with "Rescheduled" label
- `status === 'cancelled'` -- Muted "Cancelled" text

### Reschedule/Make-Up Rules
- Only classes with status "scheduled" (upcoming) or "absent" can be rescheduled
- The new date must be in the future
- The swap targets available timetable slots of the same class type at the student's branch
- Uses the existing `swapScheduledClass` service function which marks the original as "swapped" and creates a new "scheduled" entry

### No New Database Tables or Migrations Required
All data structures already exist. The feature reads from `student_class_enrollments`, `student_scheduled_classes`, `branch_timetables`, and `term_calendars`, and writes via the existing `swapScheduledClass` function.

