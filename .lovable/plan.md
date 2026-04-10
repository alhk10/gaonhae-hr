

## Plan: Add "Copy to Next Year" for Public Holidays

### Problem
The public holidays table only contains 2025 entries. May 1st 2026 is not in the database, so the class schedule selector correctly shows it as a regular day. The admin needs to add 2026 holidays, but doing so one-by-one is tedious since most holidays recur annually.

### Solution
Add a "Copy to Next Year" button in the Public Holiday Management settings that duplicates all holidays from the selected/current year to the next year, adjusting dates by +1 year. This lets the admin quickly populate 2026 holidays, then manually adjust any that shift (like Hari Raya).

### Changes

#### 1. `PublicHolidayManagement.tsx`
- Add a year filter/selector to view holidays by year
- Add a "Copy to [Next Year]" button that:
  - Takes all holidays from the displayed year
  - Creates new entries with dates shifted +1 year
  - Skips duplicates (holidays already existing in the target year)
  - Shows a toast with count of holidays copied

#### 2. `publicHolidayService.ts`
- Add `copyHolidaysToYear(sourceYear: number, targetYear: number)` function
  - Fetches holidays for the source year
  - Checks for existing holidays in target year to avoid duplicates
  - Inserts new records with adjusted dates and `is_monday_holiday` recalculated based on new day-of-week

#### 3. `PublicHolidayManagement.tsx` — Year Display
- Add year tabs or dropdown (2025, 2026, etc.) to filter the holiday list
- Default to the current year (2026)
- Show a prompt/banner when no holidays exist for the current year

### Technical Details
- The `year` column is auto-derived from the `date` column in the existing `addPublicHoliday` service
- `is_monday_holiday` is determined by whether the new date falls on a Monday
- The class schedule selector (`ClassScheduleSelector.tsx`) already filters holidays correctly — no changes needed there
- Once 2026-05-01 is added to the database, the Fri May 1 slot will automatically be hidden from the schedule grid

