

# Plan: Add Grading Slots to Weekly Timetable

## Overview
Enhance the Branch Weekly Timetable component to display grading slots alongside regular class schedules, showing when grading events occur and which students are registered.

## Data Flow

| Source | Table | Key Fields |
|--------|-------|------------|
| Regular Classes | `branch_timetables` | Recurring schedule template by weekday |
| Grading Slots | `grading_slots` | Actual dated events with `grading_date`, `start_time`, `belt_levels` |
| Grading Registrations | `grading_registrations` | Students registered for each slot |

## Changes Summary

| File | Change |
|------|--------|
| `src/components/dashboard/BranchWeeklyTimetable.tsx` | Add grading slots query, merge into weekly display |
| `src/services/gradingService.ts` | Add function to get grading slots by date range |

## Implementation Details

### 1. Add New Service Function in gradingService.ts

```typescript
// Get grading slots for a specific date range and branch
export const getGradingSlotsForWeek = async (
  startDate: string,
  endDate: string,
  branchId: string
): Promise<(GradingSlot & { registrations: GradingRegistration[] })[]> => {
  // Query grading_slots filtered by branch_id, date range, and status = 'active'
  // Join with grading_registrations to get registered students
};
```

### 2. Update BranchWeeklyTimetable Component

**New Query for Grading Slots:**
```typescript
const { data: gradingSlots = [] } = useQuery({
  queryKey: ['grading-slots-week', branchId, weekStartStr, weekEndStr],
  queryFn: () => getGradingSlotsForWeek(weekStartStr, weekEndStr, branchId),
});
```

**Add Grading Interface:**
```typescript
interface GradingSlotDisplay {
  id: string;
  startTime: string;
  endTime: string | null;
  title: string;
  beltLevels: string[];
  students: { id: string; name: string; currentBelt: string }[];
}
```

**Merge Grading Slots into Daily View:**
- For each day in the week, filter grading slots where `grading_date` matches
- Display grading slots with distinct styling (different background color/border)
- Show belt levels as badges
- List registered students

### 3. Visual Design

**Grading Slot Card Styling:**
- Orange/amber border and subtle background to differentiate from regular classes
- "GRADING" badge at the top
- Belt level badges displayed
- Student list with their current belt

**UI Mockup:**
```text
+------------------------+
| 08:00 AM               |
| [GRADING]              |
| Foundation 1           |
| ---------------------- |
| - Kyle Bowers (F1)     |
| - Ethan Bell (F1)      |
+------------------------+
```

### 4. Sorting Logic

Merge grading slots with class slots and sort by start time:
- Classes have `startTime` from timetable
- Grading slots have `start_time` from grading_slots table
- Combined and sorted for display in time order

## Technical Notes

### Data Differences
| Aspect | Regular Classes | Grading Slots |
|--------|-----------------|---------------|
| Schedule | Recurring (weekday-based) | Specific date |
| Students | From `student_scheduled_classes` | From `grading_registrations` |
| Display | Class type (Junior, Kids, etc.) | Belt levels + GRADING badge |

### Performance
- Grading slots query runs in parallel with existing queries
- Only fetches slots for the displayed week
- Registrations included in a single query via join

## Files to Modify

| File | Action |
|------|--------|
| `src/services/gradingService.ts` | Add `getGradingSlotsForWeek` function |
| `src/components/dashboard/BranchWeeklyTimetable.tsx` | Add grading slots query and display logic |

