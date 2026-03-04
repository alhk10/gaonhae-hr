

## Plan: Add Lesson Booking from My Classes Tab

### Overview
Add an "Add Lesson" button on the My Classes tab that lets students book unbooked lessons from their remaining entitlement sessions. Uses a compact dialog to pick a date and timetable slot, then creates a `student_scheduled_classes` entry via the existing `createScheduledClass` service.

### Changes to `src/components/dashboard/StudentMyClassSchedule.tsx`

1. **Accept entitlements data as prop** — Add `entitlements` and `readOnly` props. Calculate unbooked sessions (total entitlement sessions minus already scheduled classes count).

2. **Add "Add Lesson" button** — Show a compact button with remaining session count badge near the filter row. Only visible when unbooked sessions > 0 and not readOnly.

3. **Create inline Add Lesson Dialog** — A compact `Dialog` with:
   - Calendar date picker (restricted to valid weekdays from timetables, within active term dates, future dates only)
   - Available time slots for selected date (from branch timetables, with capacity checks)
   - Confirm button that calls `createScheduledClass` from `classEnrollmentService`
   - Auto-refresh scheduled classes query on success

4. **Capacity check** — Before showing a slot, query existing `student_scheduled_classes` for that date+timetable_id to check against `max_capacity`.

### Changes to `src/components/dashboard/StudentDashboard.tsx`

1. **Pass entitlements and readOnly** to `StudentMyClassSchedule`:
   ```tsx
   <StudentMyClassSchedule 
     studentId={studentId!} 
     branchId={student?.branch_id}
     entitlements={entitlements}
     readOnly={readOnly}
   />
   ```

### Technical Details
- Reuse existing `createScheduledClass` from `classEnrollmentService.ts` — no new service code needed.
- Unbooked count = `totalSessions - scheduledClasses.filter(s => s.status !== 'cancelled' && s.status !== 'swapped').length`
- The dialog reuses the same timetable data already fetched in `StudentMyClassSchedule`.
- Compact design: small calendar, horizontal slot chips, minimal padding.

