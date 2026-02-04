
# Plan: Hide Past Weeks from Class Schedule Grid

## Problem Analysis

The class schedule selector in the "Pay School Fees" dialog is showing weeks that have already passed:
- **Week 1** (Jan 19): Entirely in the past - should be hidden
- **Week 2** (Jan 26): Entirely in the past - should be hidden  
- **Week 3** (Feb 2): Current week (today is Feb 4) - should be shown but is currently missing

The root cause is in `ClassScheduleSelector.tsx` where the `termWeeks` calculation includes all weeks from the term start date without checking if they've already passed.

---

## Solution

Update the week filtering logic to:
1. Skip weeks where all days have already passed
2. Within the current week, filter out individual dates that are in the past
3. Keep future weeks as-is

---

## Implementation Details

### File: `src/components/dashboard/ClassScheduleSelector.tsx`

**Change 1**: Add `isBefore` to the date-fns imports (line 6)

**Before**:
```javascript
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO, isSameDay } from 'date-fns';
```

**After**:
```javascript
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO, isSameDay, isBefore, startOfDay } from 'date-fns';
```

**Change 2**: Update `termWeeks` calculation (lines 104-145)

Add filtering logic to:
1. Filter out days that are in the past from each week's `validDays`
2. Only include weeks that have at least one remaining future day

**Updated logic**:
```javascript
const termWeeks = useMemo(() => {
  if (!term) return [];
  
  const termStart = parseISO(term.start_date);
  const termEnd = parseISO(term.end_date);
  const breaks = term.breaks || [];
  const today = startOfDay(new Date()); // Today at midnight for comparison
  
  const weeks: { weekNumber: number; startDate: Date; days: Date[] }[] = [];
  let currentWeekStart = startOfWeek(termStart, { weekStartsOn: 1 });
  let weekNumber = 1;
  
  while (currentWeekStart <= termEnd && weekNumber <= 20) {
    const weekEnd = addDays(currentWeekStart, 6);
    
    // Check if this week is during a break
    const isBreakWeek = isWeekInBreak(currentWeekStart, weekEnd, breaks);
    
    if (!isBreakWeek) {
      // Get days that are within the term period
      const daysInTerm = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
        .filter(day => isWithinInterval(day, { start: termStart, end: termEnd }));
      
      // Filter out public holidays from the days
      const daysWithoutHolidays = daysInTerm.filter(day => !isPublicHoliday(day));
      
      // Filter out past dates (keep today and future dates)
      const validDays = daysWithoutHolidays.filter(day => !isBefore(day, today));
      
      // Only add the week if there are valid future days
      if (validDays.length > 0) {
        weeks.push({
          weekNumber,
          startDate: currentWeekStart,
          days: validDays,
        });
      }
      weekNumber++;
    }
    
    currentWeekStart = addWeeks(currentWeekStart, 1);
  }
  
  return weeks;
}, [term, publicHolidays]);
```

---

## Summary

| File | Change |
|------|--------|
| `src/components/dashboard/ClassScheduleSelector.tsx` | Add `isBefore`, `startOfDay` imports; filter out past dates from week display |

---

## Expected Result

After this fix:
- Week 1 (Jan 19) and Week 2 (Jan 26) will be hidden as they're entirely in the past
- Week 3 (Feb 2) will appear as the first week, showing only Feb 4-8 (Wed-Sun) since Feb 2-3 have passed
- Future weeks will display normally with all their operating days
- Week numbering will still reflect the original term week numbers (Week 3, Week 4, etc.)
