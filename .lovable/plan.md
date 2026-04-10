

## Plan: Add Country Column to Public Holidays

### Problem
All public holidays are stored without a country identifier, making it impossible to distinguish between Singapore and Australia holidays.

### Solution
Add a `country` column to the `public_holidays` table and update the UI to allow filtering and setting the country per holiday.

### Changes

#### 1. Database Migration
- Add `country text NOT NULL DEFAULT 'Singapore'` to `public_holidays` table
- All existing holidays default to Singapore

#### 2. `publicHolidayService.ts`
- Add `country` to the `PublicHoliday` interface
- Include `country` in `addPublicHoliday`, `updatePublicHoliday`, and `copyHolidaysToYear` operations

#### 3. `PublicHolidayManagement.tsx`
- Add a country filter dropdown (All / Singapore / Australia) next to the year selector
- Add a country select field in both the Add and Edit holiday dialogs
- Add a "Country" column to the holidays table
- Filter the displayed holidays by both year and country

### Technical Details
- Country values: `'Singapore'` and `'Australia'`
- Default: `'Singapore'` (no impact on existing data)
- The `copyHolidaysToYear` function will preserve the country value when copying
- Monday holiday bonus logic remains unchanged (applies regardless of country)

