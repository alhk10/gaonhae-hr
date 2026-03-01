

## Plan: Redesign "View & Edit Bookings" as Monthly Calendar

Replace the current dropdown-based booking selector with a monthly calendar view showing booked slots. Clicking a booked date opens the branch change form.

### Changes to `src/components/dashboard/SlotBookingBranchChangeDialog.tsx`

1. **Two-panel layout**: Calendar view (default) → Edit form (on slot click)
2. **Monthly calendar**: Use the existing `Calendar` component (`react-day-picker`). Highlight dates with bookings using colored modifiers. Show branch name dots/badges on booked dates.
3. **Interaction flow**:
   - User sees a monthly calendar with booked dates highlighted (color-coded by status: approved=green, pending=yellow)
   - User clicks a booked date → shows that date's booking details below the calendar with branch info
   - Below the selected booking, show the "New Branch" select and "Reason" fields
   - Submit triggers the existing `createEditRequest` flow
4. **Selected date indicator**: Show the selected booking's details (date, current branch, status) in a card below the calendar
5. **Dialog widened** to `sm:max-w-lg` to accommodate the calendar
6. **Multi-booking dates**: If a date has multiple bookings, show a list to pick from

### No new files needed. Single file edit to `SlotBookingBranchChangeDialog.tsx`.

