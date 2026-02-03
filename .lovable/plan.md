
# Implementation Plan: Correct Belt Order System-Wide

## Overview

Update the belt hierarchy across the entire system to match the correct progression order provided. This requires changes to both the frontend constants and database validation function.

---

## New Belt Order (22 levels)

| # | Belt Level |
|---|------------|
| 1 | Foundation 1 |
| 2 | Foundation 2 |
| 3 | Foundation 3 |
| 4 | White |
| 5 | Yellow Tip |
| 6 | Yellow |
| 7 | Green Tip |
| 8 | Green |
| 9 | Blue Tip |
| 10 | Blue |
| 11 | Red Tip |
| 12 | Red |
| 13 | Black Tip |
| 14 | 1st Poom |
| 15 | 1st Dan |
| 16 | 2nd Poom |
| 17 | 2nd Dan |
| 18 | 3rd Poom |
| 19 | 3rd Dan |
| 20 | 4th Poom |
| 21 | 4th Dan |
| 22 | 5th Dan |

### Key Changes from Current Order
- Remove "White Tip" (students start at White after Foundation)
- Remove "Brown Tip" and "Brown" (replaced by Black Tip progression)
- Change naming from "Poom 1", "Dan 1" to "1st Poom", "1st Dan"
- Interleave Poom and Dan levels (Poom for under-15, Dan for 15+)
- 5th Dan has no Poom equivalent

---

## Files to Modify

### 1. Central Constants File
**File**: `src/constants/beltLevels.ts`

Update the BELT_LEVELS array to the correct order. This is the source of truth imported by many components.

### 2. Database Validation Function
**File**: New migration to update `is_valid_belt_level` function

Update the PostgreSQL function that validates belt levels against the new list. This ensures database constraints accept the new values.

### 3. Branch Timetable Service
**File**: `src/services/branchTimetableService.ts`

This file has a duplicate BELT_LEVELS definition. Remove the duplicate and import from the central constants file.

### 4. Add Grading Slot Dialog
**File**: `src/components/sales/AddGradingSlotDialog.tsx`

Remove local BELT_LEVELS definition and import from central constants.

### 5. Edit Product Dialog
**File**: `src/components/sales/EditProductDialog.tsx`

Remove local BELT_LEVELS definition and import from central constants.

### 6. Add Product Dialog
**File**: `src/components/sales/AddProductDialog.tsx`

Remove local BELT_LEVELS definition and import from central constants.

---

## Technical Details

### Updated Constants File
```typescript
export const BELT_LEVELS = [
  'Foundation 1',
  'Foundation 2', 
  'Foundation 3',
  'White',
  'Yellow Tip',
  'Yellow',
  'Green Tip',
  'Green',
  'Blue Tip',
  'Blue',
  'Red Tip',
  'Red',
  'Black Tip',
  '1st Poom',
  '1st Dan',
  '2nd Poom',
  '2nd Dan',
  '3rd Poom',
  '3rd Dan',
  '4th Poom',
  '4th Dan',
  '5th Dan'
] as const;
```

### Database Migration
Update the `is_valid_belt_level` function with the new valid belts array matching the frontend constants.

### Import Pattern for Components
Components with local definitions will be updated to:
```typescript
import { BELT_LEVELS } from '@/constants/beltLevels';
```

---

## Data Migration Consideration

Existing data in the database may contain old belt values like:
- "White Tip" (no longer valid)
- "Brown Tip", "Brown" (replaced by Black Tip)
- "Poom 1", "Poom 2", etc. (now "1st Poom", "2nd Poom")
- "Dan 1", "Dan 2", etc. (now "1st Dan", "2nd Dan")

A data migration script will update existing records to match the new naming convention:
- "White Tip" → "White" 
- "Brown Tip" → "Black Tip"
- "Brown" → "Black Tip"  
- "Poom 1" → "1st Poom"
- "Dan 1" → "1st Dan"
- etc.

---

## Implementation Sequence

1. Create database migration to update existing data to new naming
2. Update the `is_valid_belt_level` function with new valid values
3. Update `src/constants/beltLevels.ts` with correct order
4. Remove duplicate definitions from:
   - `src/services/branchTimetableService.ts`
   - `src/components/sales/AddGradingSlotDialog.tsx`
   - `src/components/sales/EditProductDialog.tsx`
   - `src/components/sales/AddProductDialog.tsx`
5. Add imports from central constants to those files

---

## Impact Summary

| Area | Change |
|------|--------|
| Student registration | Belt dropdown shows correct 22 options |
| Grading slots | Belt selection uses correct hierarchy |
| Products | Belt restrictions use correct list |
| Timetables | Class belt requirements use correct list |
| Next belt calculation | Progression follows correct order |
| Database validation | Only valid belt names accepted |
