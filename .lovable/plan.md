

# Plan: Fix Grading Slot Filtering - Variable Scoping Issue

## Problem
The grading slot "Morley - 11 Apr 2026 - 08:40 - Green Tip" is not appearing when creating an invoice for student "Mingyu Song" (Green Tip belt), showing "No slots" instead.

## Root Cause
The `getFilteredGradingSlots` function is defined at **line 165**, but it references `studentBelt` which is defined at **line 583**. This causes a variable scoping issue where `studentBelt` may be undefined when the filter runs.

## Data Verification
All data is correct in the database:
- Student "Mingyu Song": `current_belt = "green-tip"` (branch: BR1768967806476)
- Grading Slot: `belt_levels = ["Green Tip"]` (branch: BR1768967806476)
- The `normalizeBelt("green-tip")` correctly returns `"Green Tip"`

## Solution
Move the `getFilteredGradingSlots` function definition to AFTER the `studentBelt` variable declaration, ensuring the variable is in scope when the function is defined.

## Changes

### File: `src/components/sales/CreateInvoiceDialog.tsx`

1. **Remove** the `getFilteredGradingSlots` function from lines ~164-187

2. **Add** the function after `studentBelt` is defined (after line 583):

```typescript
// Get selected student's belt for filtering
const selectedStudent = students.find(s => s.id === formData.student_id);
const studentBelt = selectedStudent?.current_belt || '';

// NEW LOCATION: Get filtered grading slots based on selected branch and student's current belt
const getFilteredGradingSlots = (): GradingSlot[] => {
  let filtered = gradingSlots;
  
  // Filter by branch if selected
  if (formData.branch_id) {
    filtered = filtered.filter(slot => slot.branch_id === formData.branch_id);
  }
  
  // STRICT filter by student's current belt level - only show matching slots
  if (studentBelt) {
    const normalizedStudentBelt = normalizeBelt(studentBelt);
    filtered = filtered.filter(slot => {
      // If slot has no belt_levels defined, don't show it
      if (!slot.belt_levels || slot.belt_levels.length === 0) return false;
      // Check if student's belt is in the slot's allowed belt levels
      return slot.belt_levels.some(beltLevel => 
        normalizeBelt(beltLevel) === normalizedStudentBelt
      );
    });
  }
  
  return filtered;
};
```

## Expected Result
After this fix:
- When creating an invoice for "Mingyu Song" (Green Tip belt)
- And selecting "Grading Fees" category
- The dropdown will show: "Morley - 11 Apr 2026 - 08:40 - Green Tip"

## Technical Details

| Line Range | Current | After Fix |
|------------|---------|-----------|
| ~164-187 | `getFilteredGradingSlots` defined | Remove function |
| ~583-593 | `studentBelt` defined, then `filteredProducts` | Add `getFilteredGradingSlots` between them |

This ensures `studentBelt` is always defined before it's referenced by the function.

