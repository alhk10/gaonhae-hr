## Booking cutoff: 1 hour before lesson start

Apply a per-slot cutoff to the public Hello chat lesson booking flow in `src/pages/public/PublicHelloChat.tsx` so users cannot book or reschedule a class within 1 hour of its start time.

### Changes

1. **Per-slot booking cutoff (today's available slots)**
   - In `slotsForDate`, compute `startsAt = new Date(${iso}T${start_time})` and `isTooLate = now >= startsAt - 1h`.
   - Return `isTooLate` alongside existing fields.
   - In the Available class times list (~line 1623), treat `isTooLate` like `full`: disable the button, show label "Closed" (instead of capacity), and skip the booking action.

2. **Per-booking cancel/reschedule cutoff (your booked classes)**
   - In the booked-classes loop (~line 1545), replace the day-level `isPast` check with a time-based check: `lessonStart = new Date(${scheduled_date}T${start_time})`, `cancellable = !isAttendanceOnly && now < lessonStart - 1h`.
   - When not cancellable but not yet attended, show label "Closed" instead of "Past".

3. **Date enabling**
   - In `dateHasAvailable`, also filter out `isTooLate` slots so today's date greys out automatically once all remaining slots are within the 1-hour window.
   - Keep existing behavior allowing past dates to open if they contain bookings (for viewing attendance status).

### Notes
- Times are interpreted in the user's local timezone (same as current display logic).
- No DB/schema changes. Pure frontend rule.
- No change to submit endpoint — server still receives only allowed picks since UI prevents selection.
