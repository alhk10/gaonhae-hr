
# Fix Duration Calculation to Respect Slot Start/End Times

## Overview
Update the hours worked calculation to ensure that only time worked **within** the configured slot start and end times is counted. Currently, the calculation uses the raw check-in to check-out duration and only caps it at the expected duration. This should be refined to clamp the times to the slot boundaries.

## Current Behavior
```
Slot Config: 14:10 - 20:30 (6.33 hours expected)
Check-in: 12:00, Check-out: 22:00
Current calculation: 22 - 12 = 10 hours → capped to 6.33 hours
```

This works for the maximum cap, but doesn't handle edge cases properly:
- If check-in is **before** slot start (e.g., 12:00 when slot starts at 14:10), only time from 14:10 should count
- If check-out is **after** slot end (e.g., 22:00 when slot ends at 20:30), only time until 20:30 should count

## Expected Behavior
```
Slot Config: 14:10 - 20:30
Check-in: 12:00, Check-out: 22:00
Expected: max(12:00, 14:10) to min(22:00, 20:30)
       → 14:10 to 20:30 = 6.33 hours (full slot)

Check-in: 15:00, Check-out: 22:00
Expected: max(15:00, 14:10) to min(22:00, 20:30)
       → 15:00 to 20:30 = 5.5 hours (partial)

Check-in: 12:00, Check-out: 18:00  
Expected: max(12:00, 14:10) to min(18:00, 20:30)
       → 14:10 to 18:00 = 3.83 hours (partial)
```

## Implementation

### File: `src/utils/slotPayCalculation.ts`

#### Update `calculateActualHoursWorked` function (lines 348-383)

**Current logic:**
```typescript
const checkInHours = parseTimeToHours(checkIn);
const checkOutHours = parseTimeToHours(checkOut);
let duration = checkOutHours - checkInHours;
return Math.min(duration, expectedDuration);
```

**Updated logic:**
```typescript
const slotTiming = getSlotTimingForDateSync(dateString);
const slotStartHours = parseTimeToHours(slotTiming.start);
const slotEndHours = parseTimeToHours(slotTiming.end);

const checkInHours = parseTimeToHours(checkIn);
const checkOutHours = parseTimeToHours(checkOut);

// Clamp check-in to not be earlier than slot start
const effectiveCheckIn = Math.max(checkInHours, slotStartHours);
// Clamp check-out to not be later than slot end
const effectiveCheckOut = Math.min(checkOutHours, slotEndHours);

// If check-in is after check-out (invalid), return 0
if (effectiveCheckIn >= effectiveCheckOut) {
  return 0;
}

let duration = effectiveCheckOut - effectiveCheckIn;
return duration;
```

#### Update `calculateActualHoursWorkedAsync` function (lines 388-423)

Same logic changes but using the async `getSlotTimingForDate` function instead.

## Technical Details

| Scenario | Slot Times | Check-in | Check-out | Current Result | Fixed Result |
|----------|------------|----------|-----------|----------------|--------------|
| Early check-in, late check-out | 14:10-20:30 | 12:00 | 22:00 | 6.33h | 6.33h |
| Late check-in, late check-out | 14:10-20:30 | 15:00 | 22:00 | 6.33h | 5.5h |
| Early check-in, early check-out | 14:10-20:30 | 12:00 | 18:00 | 6h | 3.83h |
| Normal check-in/out | 14:10-20:30 | 14:10 | 20:30 | 6.33h | 6.33h |
| Partial shift | 14:10-20:30 | 16:00 | 19:00 | 3h | 3h |

## Files Modified

| File | Changes |
|------|---------|
| `src/utils/slotPayCalculation.ts` | Update both `calculateActualHoursWorked` and `calculateActualHoursWorkedAsync` functions to clamp check-in/check-out times to slot boundaries |

## Edge Cases Handled

1. **Check-in before slot starts**: Clamp to slot start time
2. **Check-out after slot ends**: Clamp to slot end time
3. **Both outside boundaries**: Returns full slot duration
4. **Check-in after slot ends**: Returns 0 (no valid work time)
5. **Check-out before slot starts**: Returns 0 (no valid work time)
6. **Overnight slots**: Existing handling retained for cases where slot end < slot start
