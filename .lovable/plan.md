

## Plan: Add Attendance Row to Slot Booking Breakdown Dialog

The current breakdown only shows bookings with existing attendance records. Bookings without attendance are silently skipped. This plan adds the ability to see those missing attendance rows and add new attendance directly from the dialog.

### Changes

**1. `src/services/slotBookingPayrollService.ts`**
- Stop skipping bookings without attendance. Instead, include them in the breakdown with `hasAttendance: false`, `pay: 0`, and no time fields.
- These rows will appear at the bottom (or in date order) so the admin can see which bookings lack attendance.

**2. `src/components/payroll/SlotBreakdownDialog.tsx`**
- Show all breakdown items (with and without attendance) in the table.
- For rows where `hasAttendance === false`: show a muted/greyed row with a "+" button in the Actions column instead of the edit pencil.
- Clicking "+" opens an inline edit mode (reuse existing edit state) to enter Clock In and Clock Out times.
- On save, call `addAttendanceRecord` from `attendanceService.ts` with the employee ID, date, times, status "Present", and calculated hours.
- After saving, call `onUpdate()` to refresh the breakdown data (which will now include the new attendance and recalculate pay).
- Accept `employeeId` as a new prop (already available in parent state).
- Show a subtle "No attendance" label and different styling (dashed border or muted background) for unattended rows.
- The total slots count at the top only counts attended slots; unattended rows are visually distinct.

**3. `src/pages/PayrollProcessing.tsx`**
- Pass `employeeId` prop to `SlotBreakdownDialog`.

### UI Behavior
- Unattended booking rows appear with a grey/muted background, "--" for times, "S$0.00" for pay.
- "+" button triggers inline time entry (same UX as edit mode).
- On successful add, toast confirmation and data refresh.
- Total Slots and Total Pay only reflect attended bookings (unchanged logic).

