

# Revised Plan: Restructure Class Schedule Selector Layout

## Overview
Redesign the class selection grid to have **days of the week on the X-axis** and **weeks on the Y-axis**. Each cell will contain the class name and timing information directly, supporting multiple classes per day.

---

## New Layout Structure

### Layout Design
| Term | Mon | Tue | Wed | Thu | Fri |
|------|-----|-----|-----|-----|-----|
| Week 1 (27 Apr) | **Junior**<br/>4:00-4:50 PM<br/>[Mon 28] | **Junior**<br/>4:00-4:50 PM<br/>[Tue 29] | **Kids**<br/>5:00-5:50 PM<br/>[Wed 30] | **Junior**<br/>4:00-4:50 PM<br/>[Thu 1] | - |
| Week 2 (04 May) | **Junior**<br/>4:00-4:50 PM<br/>[Mon 4] | **Junior**<br/>4:00-4:50 PM<br/>[Tue 5] | **Kids**<br/>5:00-5:50 PM<br/>[Wed 6] | **Junior**<br/>4:00-4:50 PM<br/>[Thu 7] | - |

**Key Features:**
- No separate class header rows
- Each cell shows: Class name, Time, and selectable date button
- Multiple classes on same day stack vertically within the cell
- Empty cells show "-" or remain blank

---

## Implementation Details

### File to Modify
`src/components/dashboard/ClassScheduleSelector.tsx`

### Key Changes

#### 1. Determine Operating Days
```typescript
const operatingDays = useMemo(() => {
  const days = new Set(eligibleClasses.map(c => c.weekday));
  const WEEKDAYS = [
    { value: 1, short: 'Mon', full: 'Monday' },
    { value: 2, short: 'Tue', full: 'Tuesday' },
    { value: 3, short: 'Wed', full: 'Wednesday' },
    { value: 4, short: 'Thu', full: 'Thursday' },
    { value: 5, short: 'Fri', full: 'Friday' },
  ];
  return WEEKDAYS.filter(w => days.has(w.value));
}, [eligibleClasses]);
```

#### 2. Get Classes for a Specific Day
```typescript
const getClassesForDay = (weekday: number) => {
  return eligibleClasses.filter(c => c.weekday === weekday);
};
```

#### 3. New Grid Structure
```
┌──────────────┬─────────────┬─────────────┬─────────────┐
│ Term         │    Mon      │    Tue      │    Wed      │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Week 1       │ Junior      │ Junior      │ Kids        │
│ 27 Apr       │ 4:00-4:50   │ 4:00-4:50   │ 5:00-5:50   │
│              │ [Mon 28]    │ [Tue 29]    │ [Wed 30]    │
│              │─────────────│             │─────────────│
│              │ Teens       │             │ Competition │
│              │ 5:00-5:50   │             │ 6:00-6:50   │
│              │ [Mon 28]    │             │ [Wed 30]    │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Week 2       │ ...         │ ...         │ ...         │
└──────────────┴─────────────┴─────────────┴─────────────┘
```

#### 4. Cell Rendering Logic
Each cell renders all classes available for that day:
```tsx
{operatingDays.map(dayInfo => {
  const dayDate = week.days.find(d => d.getDay() === dayInfo.value);
  const classesForDay = getClassesForDay(dayInfo.value);
  
  if (!dayDate || classesForDay.length === 0) {
    return <td className="text-center text-muted-foreground">-</td>;
  }
  
  return (
    <td className="p-2">
      <div className="space-y-2">
        {classesForDay.map(cls => {
          const slotKey = `${cls.id}_${format(dayDate, 'yyyy-MM-dd')}`;
          const isSelected = selectedSlots.includes(slotKey);
          
          return (
            <div key={cls.id} className="text-center">
              <div className="text-xs font-medium">{cls.class_type}</div>
              <div className="text-xs text-muted-foreground">
                {formatTime(cls.start_time)}-{formatTime(cls.end_time)}
              </div>
              <button
                onClick={() => handleToggleSlot(cls.id, dayDate)}
                className={isSelected ? 'bg-primary' : 'bg-secondary'}
                disabled={isAtLimit && !isSelected}
              >
                {format(dayDate, 'EEE d')}
              </button>
            </div>
          );
        })}
      </div>
    </td>
  );
})}
```

---

## Component Structure

```tsx
<div className="space-y-4">
  {/* Simple table grid */}
  <div className="border rounded-lg overflow-hidden">
    <table className="w-full">
      <thead className="bg-muted">
        <tr>
          <th className="p-2 text-left">Term</th>
          {operatingDays.map(d => (
            <th key={d.value} className="p-2 text-center">{d.short}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {termWeeks.map(week => (
          <tr key={week.weekNumber} className="border-t">
            <td className="p-2">
              <div className="font-medium">Week {week.weekNumber}</div>
              <div className="text-xs text-muted-foreground">
                {format(week.startDate, 'dd MMM')}
              </div>
            </td>
            {operatingDays.map(dayInfo => (
              <td key={dayInfo.value} className="p-2 border-l">
                {/* Classes for this day stacked vertically */}
                {renderClassesForCell(week, dayInfo)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
  {/* Summary footer */}
  <div className="text-sm pt-2 border-t flex justify-between">
    <span>{selectedSlots.length} of {maxSessions} sessions selected</span>
  </div>
</div>
```

---

## Visual Example

### Single Class Per Day
| Term | Mon | Tue | Wed |
|------|-----|-----|-----|
| Week 1<br/>27 Apr | **Junior**<br/>4:00-4:50 PM<br/>`[Mon 28]` | **Junior**<br/>4:00-4:50 PM<br/>`[Tue 29]` | - |

### Multiple Classes Per Day
| Term | Mon | Wed |
|------|-----|-----|
| Week 1<br/>27 Apr | **Junior**<br/>4:00-4:50 PM<br/>`[Mon 28]`<br/>───<br/>**Teens**<br/>5:00-5:50 PM<br/>`[Mon 28]` | **Kids**<br/>5:00-5:50 PM<br/>`[Wed 30]`<br/>───<br/>**Competition**<br/>6:00-6:50 PM<br/>`[Wed 30]` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/ClassScheduleSelector.tsx` | Complete restructure - remove class headers, embed class info in cells |

---

## Preserved Functionality

- Session limit validation (max sessions = lessonsPerWeek × termWeeks)
- Toast warnings when limit reached
- Selected/unselected button styling
- Disabled state when at limit
- Summary counter display

## Removed Features

- Separate class header rows
- Day-of-week bulk selection checkboxes (no longer practical with mixed classes per column)

