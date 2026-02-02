
# Plan: Standardize Belt Level Options and Display Format

## Summary

The Trial and Student dialogs currently have inconsistent belt level options and the values are stored differently in the database. This plan will:
1. Align both dialogs to use the same belt level options
2. Store belt values without hyphens (use spaces for readability)
3. Add a display utility to format belt levels nicely in the UI

---

## Current Issues

### 1. Inconsistent Belt Values
- **Trial dialog** saves values as-is (e.g., `"Foundation 2"`)
- **Student/Edit dialogs** transform values to lowercase with hyphens (e.g., `"foundation-2"`)

### 2. Different Belt Options
- Trial has `White Tip, Brown, Brown Tip`
- Student has `Yellow Tip, Black Tip, Poom 1-4`

---

## Implementation Steps

### Step 1: Create a Shared Belt Constants File

Create a new constants file to define the standard belt levels used across the application.

**New file: `src/constants/beltLevels.ts`**

This will contain:
- A single source of truth for all belt level options
- A utility function to format belt values for display (removing hyphens, proper casing)

```text
Belt levels to include:
  - Foundation 1, Foundation 2, Foundation 3
  - White, White Tip
  - Yellow, Yellow Tip
  - Green, Green Tip
  - Blue, Blue Tip
  - Red, Red Tip
  - Brown, Brown Tip
  - Poom 1, Poom 2, Poom 3, Poom 4
  - Dan 1, Dan 2, Dan 3, Dan 4, Dan 5
```

### Step 2: Update AddTrialDialog.tsx

- Import belt levels from the new constants file
- Keep saving values directly (as-is with spaces, e.g., `"Foundation 2"`)

### Step 3: Update AddStudentDialog.tsx

- Import belt levels from the new constants file
- Remove the `.toLowerCase().replace(/\s+/g, '-')` transformation
- Save values directly with spaces (e.g., `"Foundation 2"` instead of `"foundation-2"`)

### Step 4: Update EditStudentDialog.tsx

- Import belt levels from the new constants file
- Remove the `.toLowerCase().replace(/\s+/g, '-')` transformation
- Save values directly with spaces

### Step 5: Add Display Formatting for Change Log

Update `StudentChangeLog.tsx` to properly format belt level values:
- Convert any existing hyphenated values to proper display format
- Example: `"foundation-2"` displays as `"Foundation 2"`

---

## Technical Details

### Belt Level Options (Standard List)

The unified belt level list will include all ranks from beginner to advanced:

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

### Display Formatting Utility

```typescript
export const formatBeltLevel = (belt: string): string => {
  if (!belt) return '';
  // Convert hyphenated values to display format
  // e.g., "foundation-2" -> "Foundation 2"
  return belt
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/constants/beltLevels.ts` | **New file** - Central belt constants and formatter |
| `src/components/sales/AddTrialDialog.tsx` | Use shared constants, remove local list |
| `src/components/sales/AddStudentDialog.tsx` | Use shared constants, remove hyphen transformation |
| `src/components/sales/EditStudentDialog.tsx` | Use shared constants, remove hyphen transformation |
| `src/components/sales/StudentChangeLog.tsx` | Apply formatting to belt values in display |

---

## Backward Compatibility

Existing students with hyphenated belt values (e.g., `"foundation-2"`) will:
- Display correctly due to the format utility converting hyphens to spaces
- Continue to work in the edit dialog since we'll match against formatted values
