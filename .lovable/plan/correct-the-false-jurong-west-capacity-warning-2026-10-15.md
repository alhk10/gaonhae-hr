# Correct the false Jurong West capacity warning

## Investigation result

Jurong West is **not full on 15/10/2026**:
- Supabase has **1 slot configured for Thursday** at Jurong West.
- There are **0 bookings** at Jurong West on that date.
- RYAN GOH's approved booking remains at Balmoral.

The branch-change check uses the displayed date, `15/10/2026`, instead of `thursday` to look up capacity. That lookup returns no value and defaults to zero, so even an empty branch is reported as full. Both staff booking-management screens contain this error. The same incorrect lookup also appears in the bulk-booking capacity display and date-selection calendar.

## Proposed fix

1. Use a shared weekday lookup for capacity checks, separate from the DD/MM/YYYY format used on screen.
2. Correct both branch-change screens and the two related capacity lookups.
3. Make the branch-change message reflect actual available capacity rather than always saying “Ready to move” after choosing another branch.
4. Preserve configured limits, cancelled/rejected booking exclusions, approval rules and all existing bookings. No database changes or automatic booking moves.

## Validation

- Add regression checks for 15/10/2026 resolving to Thursday, one configured slot with no bookings allowing a move, and one occupied slot blocking it.
- Check cancelled/rejected bookings and the booking being moved do not consume target capacity.
- Check preview errors and exercise the branch-change dialog where an authenticated session is available. Authenticated end-to-end verification is unavailable for this externally managed Supabase session; do not move a real booking merely to test.

## Technical details

Update `AdminSlotBooking.tsx`, `SlotBookingManagementContent.tsx`, `BulkSlotBookingDialog.tsx` and `EnhancedCalendar.tsx` to use a typed weekday helper. Keep `formatDate` exclusively for displayed dates. Record the shared lookup convention in `AGENTS.md` and keep focused tests alongside the existing utility tests.