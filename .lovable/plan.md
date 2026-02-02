# Plan: Standardize Belt Level Options and Display Format

## Status: ✅ COMPLETED

## Summary

The Trial and Student dialogs now use consistent belt level options and values are stored without hyphens in the database.

---

## Implementation Complete

### Step 1: ✅ Created Shared Belt Constants File
- **`src/constants/beltLevels.ts`** - Central source of truth with `BELT_LEVELS` array and `formatBeltLevel` utility

### Step 2: ✅ Updated AddTrialDialog.tsx
- Imported and used shared `BELT_LEVELS` constant

### Step 3: ✅ Updated AddStudentDialog.tsx
- Imported shared constants
- Removed the `.toLowerCase().replace(/\s+/g, '-')` transformation
- Belt values now saved directly with spaces

### Step 4: ✅ Updated EditStudentDialog.tsx
- Imported shared constants and `formatBeltLevel` utility
- Removed the hyphen transformation
- Added `formatBeltLevel` when loading existing student data for backward compatibility

### Step 5: ✅ Updated StudentChangeLog.tsx
- Imported `formatBeltLevel` utility
- Applied formatting to belt values in display for proper rendering of legacy hyphenated values

---

## Technical Details

### Unified Belt Levels
```typescript
export const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'White Tip',
  'Yellow', 'Yellow Tip',
  'Green', 'Green Tip',
  'Blue', 'Blue Tip',
  'Red', 'Red Tip',
  'Brown', 'Brown Tip',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
];
```

### Backward Compatibility
Existing students with hyphenated belt values (e.g., `"foundation-2"`) will:
- Display correctly due to the `formatBeltLevel` utility converting hyphens to spaces
- Load correctly in the edit dialog
