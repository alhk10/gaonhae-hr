

# Revised Plan: Flexible Term Lesson Limit Validation

## Overview
Update the class selection logic to enforce a **total term limit** rather than a strict per-week limit. This gives users flexibility to distribute their lessons across weeks as they prefer.

**Example:** A package with 1 lesson/week x 10 weeks = 10 total lessons. User may select:
- 2 lessons in Week 1 + 0 lessons in Week 2 + 1 lesson in Week 3... (still totals 10)
- Any distribution as long as total does not exceed 10

---

## Changes Required

### 1. Rename "Pricing Tier" to "Package"
**File:** `src/components/dashboard/PaySchoolFeesDialog.tsx`

Update labels and placeholders:
- Line 417: "Pricing Tier *" → "Package *"
- Line 420: "pricing tiers" → "packages"  
- Line 425: Placeholder "Select pricing tier" → "Select package"

### 2. Pass Lesson Configuration to ClassScheduleSelector
**File:** `src/components/dashboard/PaySchoolFeesDialog.tsx`

Pass the selected product's lesson settings to the ClassScheduleSelector component:
- Add `lessonsPerWeek` prop (from `selectedProduct.lessons_per_week`)
- Add `totalTermWeeks` prop (from calculated `termWeeks`)

### 3. Implement Term-Based Limit Validation
**File:** `src/components/dashboard/ClassScheduleSelector.tsx`

**New Props:**
```typescript
interface ClassScheduleSelectorProps {
  // ... existing props
  lessonsPerWeek?: number;  // Max lessons allowed per week (from product config)
}
```

**Validation Logic:**
```text
Maximum Sessions = lessonsPerWeek × numberOfTermWeeks

When user attempts to add a session:
  IF currentSelections >= Maximum Sessions:
    → Block selection
    → Show toast: "Maximum X sessions reached for this package"
  ELSE:
    → Allow selection
```

**UI Feedback:**
- Display selection counter in the summary: "X of Y sessions selected"
- Show warning state when limit reached
- Prevent further selections via click handlers once limit is reached
- Day-of-week checkboxes will only add sessions up to the remaining available slots

### 4. Handle Bulk Selection Constraints
**File:** `src/components/dashboard/ClassScheduleSelector.tsx`

When using day-of-week checkboxes (e.g., selecting all Mondays):
- Calculate how many sessions would be added
- If adding all would exceed the limit, only add sessions up to the limit
- Show toast: "Added X sessions (limit reached)"

---

## Technical Details

### Calculation Example
| Package | Lessons/Week | Term Weeks | Max Sessions |
|---------|--------------|------------|--------------|
| 1x Week | 1 | 10 | 10 |
| 2x Week | 2 | 10 | 20 |
| Unlimited | 7 | 10 | 70 |

### handleToggleSlot Modification
```typescript
const handleToggleSlot = (classId: string, date: Date) => {
  const slotKey = `${classId}_${format(date, 'yyyy-MM-dd')}`;
  const isRemoving = selectedSlots.includes(slotKey);
  
  if (isRemoving) {
    // Always allow removal
    onSlotsChange(selectedSlots.filter(s => s !== slotKey));
  } else {
    // Check term limit before adding
    const maxSessions = (lessonsPerWeek || 7) * termWeeks.length;
    if (selectedSlots.length >= maxSessions) {
      toast.warning(`Maximum ${maxSessions} sessions allowed for this package`);
      return;
    }
    onSlotsChange([...selectedSlots, slotKey]);
  }
};
```

### handleToggleDayForClass Modification
```typescript
const handleToggleDayForClass = (...) => {
  // ... find matching class and slots for this day
  
  const allSelected = allSlotsForDay.every(slot => selectedSlots.includes(slot));
  
  if (allSelected) {
    // Deselect all - always allowed
    onSlotsChange(selectedSlots.filter(s => !allSlotsForDay.includes(s)));
  } else {
    // Select all - respect limit
    const maxSessions = (lessonsPerWeek || 7) * termWeeks.length;
    const slotsToAdd = allSlotsForDay.filter(s => !selectedSlots.includes(s));
    const availableSlots = maxSessions - selectedSlots.length;
    
    if (availableSlots <= 0) {
      toast.warning(`Maximum ${maxSessions} sessions reached`);
      return;
    }
    
    const actualSlotsToAdd = slotsToAdd.slice(0, availableSlots);
    onSlotsChange([...selectedSlots, ...actualSlotsToAdd]);
    
    if (actualSlotsToAdd.length < slotsToAdd.length) {
      toast.info(`Added ${actualSlotsToAdd.length} sessions (limit reached)`);
    }
  }
};
```

### Updated Summary Display
```typescript
{selectedSlots.length > 0 && (
  <div className="text-sm text-right pt-2 border-t flex justify-between items-center">
    <span className="text-muted-foreground">
      {lessonsPerWeek && (
        `Limit: ${lessonsPerWeek} per week × ${termWeeks.length} weeks`
      )}
    </span>
    <span className={selectedSlots.length >= maxSessions ? 'text-amber-600 font-medium' : ''}>
      {selectedSlots.length} of {maxSessions} sessions selected
      {selectedSlots.length >= maxSessions && ' (limit reached)'}
    </span>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | Rename labels, pass `lessonsPerWeek` prop |
| `src/components/dashboard/ClassScheduleSelector.tsx` | Add limit validation, update UI feedback |

---

## User Experience Flow

1. User selects a Package (e.g., "1x Week - $30/week")
2. Term has 10 teaching weeks → Maximum 10 sessions allowed
3. User sees class calendar with sessions
4. Counter shows: "0 of 10 sessions selected"
5. User selects 2 sessions in Week 1 → "2 of 10 sessions selected"
6. User selects 0 sessions in Week 2 (compensating)
7. When user reaches 10 selections, further clicks are blocked with toast message
8. User can always deselect to make room for different sessions

