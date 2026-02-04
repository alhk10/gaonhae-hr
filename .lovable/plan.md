
# Plan: Fix Week Numbering to Consider Operating Days Only

## Problem Analysis

The week of February 2-8 is being incorrectly marked as a "break week" because the current logic checks all 7 days (Mon-Sun) for break overlap. However:

- **Morley operates Mon-Fri only** (weekday 1-5)
- The Lunar New Year break starts on Feb 7 (Saturday)
- For the week of Feb 2-8, the actual operating days (Mon Feb 2 - Fri Feb 6) are all **before** the break starts

**Current incorrect behavior:**
- Week starting Feb 2 is marked as a break week (because Feb 7-8 overlap with break)
- This causes the week counter to skip, making Feb 23 show as "Week 3"

**Expected behavior:**
- Only check break overlap against the branch's operating days
- Feb 2-6 (Mon-Fri) don't overlap with break (Feb 7-22), so Week 3 counts
- Feb 23 correctly shows as "Week 4"

---

## Term 1 2026 Week Analysis (Morley)

| Week Start | Operating Days (Mon-Fri) | Break Overlap? | Week Number |
|------------|--------------------------|----------------|-------------|
| Jan 19 | Jan 19-23 | No | Week 1 |
| Jan 26 | Jan 26-30 | No | Week 2 |
| Feb 2 | Feb 2-6 | No (break starts Feb 7) | Week 3 |
| Feb 9 | Feb 9-13 | Yes (all in break) | Skip |
| Feb 16 | Feb 16-20 | Yes (all in break) | Skip |
| Feb 23 | Feb 23-27 | No (break ends Feb 22) | Week 4 |

---

## Solution

Modify the `isWeekInBreak` function to only consider the branch's operating days when checking for break overlap.

### File: `src/components/dashboard/ClassScheduleSelector.tsx`

**Change the break-checking logic:**

```typescript
// Current approach (incorrect)
const isWeekInBreak = (weekStart: Date, weekEnd: Date, breaks: any[]): boolean => {
  // Checks all 7 days of the week including weekends
};

// New approach (correct)
const isWeekInBreak = (
  weekStart: Date, 
  operatingWeekdays: number[], // e.g., [1,2,3,4,5] for Mon-Fri
  breaks: any[]
): boolean => {
  // Only check the operating days within this week
  // If ALL operating days fall within a break period, it's a break week
  // If ANY operating day is outside the break, it's a teaching week
};
```

**Implementation details:**

1. Get the operating weekdays from the `operatingDays` array (already calculated from branch timetable)
2. For each calendar week, get only the dates that fall on operating days
3. Check if ALL those operating-day dates are within a break period
4. Only skip the week if all operating days are covered by breaks

```typescript
const isWeekInBreak = (
  weekStart: Date,
  operatingWeekdays: number[], // [1,2,3,4,5] for Mon-Fri
  breaks: any[]
): boolean => {
  if (operatingWeekdays.length === 0) return false;
  
  // Get operating day dates for this week
  const operatingDates = operatingWeekdays.map(weekday => {
    // weekday: 1=Mon, 2=Tue, ..., 5=Fri, 6=Sat, 0=Sun
    const dayOffset = weekday === 0 ? 6 : weekday - 1; // Convert to offset from Monday
    return addDays(weekStart, dayOffset);
  });
  
  // Check if ALL operating dates are within breaks
  return operatingDates.every(date =>
    breaks.some(brk => {
      const breakStart = parseISO(brk.start_date);
      const breakEnd = parseISO(brk.end_date);
      return isWithinInterval(date, { start: breakStart, end: breakEnd });
    })
  );
};
```

3. Pass `operatingDays.map(d => d.value)` to the function when checking break status

---

## File Changes

| File | Change |
|------|--------|
| `src/components/dashboard/ClassScheduleSelector.tsx` | Update `isWeekInBreak` to accept operating weekdays and only check those days for break overlap |

---

## Expected Result

After this fix:
- Week 3 (Feb 2-8) is **not** marked as a break week because operating days (Mon-Fri, Feb 2-6) are before the break
- Feb 23 correctly displays as **Week 4**
- The logic correctly handles any branch's operating schedule (not just Mon-Fri)
