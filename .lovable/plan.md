

# Plan: Update Grading Belt Levels and Simplify Form

## Overview
Update the grading management system to use the correct belt structure (Foundation 1 through Dan 5), and remove the Examiner and End Time fields from the slot creation/display.

---

## Current vs Correct Belt Structure

| Current (Incorrect) | New (Correct) |
|---------------------|---------------|
| White, Yellow, Orange, Green, Blue, Purple, Brown, Red, Black | Foundation 1, Foundation 2, Foundation 3, White, Yellow Tip, Yellow, Green Tip, Green, Blue Tip, Blue, Red Tip, Red, Black Tip, Poom 1-4, Dan 1-5 |

---

## Changes Required

### 1. AddGradingSlotDialog.tsx

**Update Belt Levels Constant:**
```typescript
// Current
const BELT_LEVELS = [
  'White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black'
];

// Updated
const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
];
```

**Remove Fields from Form:**
- Remove End Time input field
- Remove Examiner input field
- Remove `end_time` and `examiner_name` from form state

**Updated Form Layout:**
- Move Max Capacity to share row with Location
- Simplify grid structure

---

### 2. GradingManagement.tsx (Table Display)

**Update Table Headers:**
Remove these columns:
- "Examiner" column
- Update "Time" column to show only start time (remove end time display)

**Update Table Rows:**
- Remove examiner display cell
- Simplify time display to show only start time

---

### 3. gradingService.ts (Types)

**Update Interfaces:**
- Keep `end_time` and `examiner_name` in interfaces for backward compatibility with existing database records
- No code changes needed since the database already has these columns; we're just hiding them from UI

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales/AddGradingSlotDialog.tsx` | Update BELT_LEVELS constant, remove end_time and examiner_name form fields |
| `src/pages/sales/GradingManagement.tsx` | Remove Examiner column, simplify Time column to show only start time |

---

## UI Preview

**Add Grading Slot Dialog (After):**
```
Branch *              Date *
[Select Branch]       [Date Picker]

Start Time           Max Capacity
[Time Input]         [Number Input]

Location
[Text Input]

Belt Levels
[Foundation 1] [Foundation 2] [Foundation 3] [White] [Yellow Tip] ...

Notes
[Textarea]
```

**Grading Slots Table (After):**
| Date | Time | Branch | Location | Belt Levels | Capacity | Status | Actions |
|------|------|--------|----------|-------------|----------|--------|---------|

---

## Execution Steps

1. Update BELT_LEVELS constant in AddGradingSlotDialog.tsx
2. Remove examiner and end_time form fields from AddGradingSlotDialog.tsx
3. Remove Examiner column from GradingManagement.tsx table
4. Simplify Time column display in GradingManagement.tsx

