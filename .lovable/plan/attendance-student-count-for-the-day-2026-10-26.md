# Attendance: student count for the day

## Per timeslot
- No change. The existing count badge (for example 5/20) stays as it is.

## End of day
- A summary row at the bottom of the day card: "Day total: 12 students · 8 attended · 2 absent · 2 not marked".
- Students in several timeslots that day are counted once for each timeslot. A second figure shows unique students, for example "(10 unique)".
- Requested (awaiting approval) students are shown separately, for example "· 1 requested", and not included in the total.

## Technical
- Display-only change in the Attendance tab, built from the bookings already loaded for the day. No database changes.
- A small helper that counts the totals, with a test for its numbers (requested bookings excluded, unique students counted once).
