
# Plan: Enhance Branch Dashboard with Renamed Title and Weekly Timetable Tab

## Overview
Update the Branch Dashboard to:
1. Rename the header from "Branch Dashboard - Morley" to "Morley Dashboard"
2. Remove the description text ("Manage students, view sales, and approve changes")
3. Add a new "Weekly Timetable" tab showing classes and enrolled students by week

## Changes Summary

| File | Change |
|------|--------|
| `src/components/dashboard/BranchDashboard.tsx` | Rename header, remove description, add Weekly Timetable tab |
| `src/components/dashboard/BranchWeeklyTimetable.tsx` | New component for weekly class view with student enrollment |

## UI Changes

### Before
```text
Branch Dashboard - Morley
Manage students, view sales, and approve changes

[Stats Cards]
[Students] [Revenue] [Pending Approvals]
```

### After
```text
Morley Dashboard

[Stats Cards]
[Students] [Revenue] [Pending Approvals] [Weekly Timetable]
```

## Detailed Implementation

### 1. Update Header in BranchDashboard.tsx

**Current:**
```tsx
<h2 className="text-2xl font-bold text-gray-900">
  Branch Dashboard - {branch?.name || 'Loading...'}
</h2>
<p className="text-muted-foreground">
  Manage students, view sales, and approve changes
</p>
```

**New:**
```tsx
<h2 className="text-2xl font-bold text-gray-900">
  {branch?.name || 'Loading...'} Dashboard
</h2>
{/* Description removed */}
```

### 2. Add Weekly Timetable Tab

Add a new tab trigger after "Pending Approvals":
```tsx
<TabsTrigger value="timetable">
  Weekly Timetable
</TabsTrigger>
```

Add corresponding TabsContent:
```tsx
<TabsContent value="timetable">
  <BranchWeeklyTimetable branchId={branchId} />
</TabsContent>
```

### 3. New Component: BranchWeeklyTimetable

Create a new component that displays:
- Week navigation (previous/next week buttons, today button)
- Week date range display (e.g., "Week of Feb 3 - Feb 9, 2026")
- Daily columns showing:
  - Weekday header with date
  - Class time slots from the branch timetable
  - Students enrolled in each class slot (grouped by class type/time)

**Data Flow:**
1. Fetch branch timetable (`branch_timetables` table) for class schedule template
2. Fetch active enrollments for the branch (`student_class_enrollments`)
3. Fetch scheduled classes for the week (`student_scheduled_classes`)
4. For each weekday, display:
   - All defined class slots from the timetable
   - Students who have scheduled classes matching that slot

**Component Structure:**
```text
+---------------------------------------------------------------+
|  Week Navigation                                               |
|  [<] [Today] [>]   Week of Feb 3 - Feb 9, 2026                |
+---------------------------------------------------------------+
| Mon 3     | Tue 4     | Wed 5     | Thu 6     | Fri 7     |...
+-----------+-----------+-----------+-----------+-----------+
| 4:00 PM   | 4:00 PM   | 4:00 PM   | 4:00 PM   | 4:00 PM   |
| Junior    | Junior    | Junior    | Junior    | Junior    |
| - Kyle B  | - Ethan B |           | - Kyle B  | - Mingyu S|
|           |           |           |           |           |
| 5:00 PM   | 5:00 PM   | 5:00 PM   | 5:00 PM   | 5:00 PM   |
| Kids      | Kids      | Kids      | Kids      | Kids      |
| - Ethan B |           | - Kyle B  |           | - Ethan B |
+-----------+-----------+-----------+-----------+-----------+
```

**Props Interface:**
```typescript
interface BranchWeeklyTimetableProps {
  branchId: string;
}
```

**Data Queries:**
1. `getClassSchedules(branchId)` - Get recurring class template
2. `getScheduledClasses(weekStart, weekEnd, branchId)` - Get actual scheduled classes
3. Join with student names for display

**Visual Design:**
- Use a grid layout with columns for each weekday
- Each class slot shows:
  - Time (e.g., "4:00 PM - 5:00 PM")
  - Class type (e.g., "Junior", "Kids")
  - List of enrolled students for that specific slot
- Color-code by class type for visual distinction
- Show empty placeholder if no students enrolled
- Highlight today's column

## Technical Notes

### Dependencies
- Uses existing services:
  - `branchTimetableService.ts` for class schedule template
  - `classEnrollmentService.ts` for scheduled classes
- Uses existing UI components: Card, Button, Badge, ScrollArea
- Uses date-fns for week calculations

### State Management
- `currentWeek`: Date state for week navigation
- React Query for data fetching with proper cache keys
- Derived state for grouping classes by day and time

### Performance Considerations
- Only fetch data for the displayed week
- Use React Query caching with 1-minute stale time
- Memoize grouped data calculations

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/dashboard/BranchDashboard.tsx` | Modify header, add tab |
| `src/components/dashboard/BranchWeeklyTimetable.tsx` | Create new component |
