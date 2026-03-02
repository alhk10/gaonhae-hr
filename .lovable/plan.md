

## Fix: Cleared attendance timing should show 0 duration and 0 pay

**Problem**: In `calculateActualHoursWorkedAsync` (line 403-406 of `src/utils/slotPayCalculation.ts`), when `checkIn` is null, the function assumes a full day worked and returns `expectedDuration`. This means Feb 28 with cleared timing shows 7h 30m and S$98.00 instead of 0.

**Root cause**: The comment says "attendance not recorded" but in this case attendance IS recorded — the admin just cleared the times.

**Fix** in `src/utils/slotPayCalculation.ts`:

Change lines 403-406 from:
```typescript
// If no check-in, assume full day (attendance not recorded)
if (!checkIn) {
  return expectedDuration;
}
```
To:
```typescript
// If no check-in, return 0 hours (no times recorded)
if (!checkIn) {
  return 0;
}
```

This single-line change ensures that when attendance times are cleared/empty, both duration and pay amount correctly show as 0.

