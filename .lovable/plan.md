

## Plan: Show Only Today on Mobile Timetable View

### Problem
The mobile timetable currently stacks all 7 days vertically, requiring excessive scrolling. The user wants to show only today's schedule on mobile.

### Changes to `src/components/dashboard/BranchWeeklyTimetable.tsx`

1. **Add day navigation state for mobile** — Add a `mobileDate` state initialized to `new Date()`, with prev/next day buttons so the user can navigate between days on mobile.

2. **Update mobile navigation header** — On mobile, show day-level navigation (< Today >) with the current day displayed (e.g., "Tue 3 Mar") instead of the week range.

3. **Filter mobile view to single day** — Instead of mapping over all `weekDays`, the mobile section will only render the single `mobileDate` day's slots.

4. **Sync mobile date with week changes** — When the user navigates weeks, reset `mobileDate` to the first day of that week (or today if the current week).

### Scope
Single file: `src/components/dashboard/BranchWeeklyTimetable.tsx`. Logic + layout change, no new dependencies.

