
# Plan: Fix Belt Normalization Bug in Grading Slot Filtering

## Problem Identified
The grading slot "Morley - 11 Apr 2026 - 08:40 - Green Tip" is not appearing for student "Mingyu Song" (current_belt: "green-tip") because of a bug in the `normalizeBelt` function.

## Root Cause Analysis

The `normalizeBelt` function at lines 70-76:

```typescript
const normalizeBelt = (belt: string): string => {
  if (!belt) return '';
  return belt.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
```

### Bug Details

This function only splits by hyphen (`-`), not by space. When belt values in `belt_levels` are stored with spaces (e.g., `"Green Tip"`), the function produces inconsistent results:

| Input | Expected | Actual Output |
|-------|----------|---------------|
| `"green-tip"` | `"Green Tip"` | `"Green Tip"` |
| `"Green Tip"` | `"Green Tip"` | `"Green tip"` |

The comparison in `getFilteredGradingSlots`:
```typescript
return slot.belt_levels.some(beltLevel => 
  normalizeBelt(beltLevel) === normalizedStudentBelt
);
```

Fails because:
- `normalizedStudentBelt` = `normalizeBelt("green-tip")` = `"Green Tip"`
- `normalizeBelt("Green Tip")` = `"Green tip"` (lowercase 't')
- `"Green tip" !== "Green Tip"` ❌

## Solution

Fix the `normalizeBelt` function to handle both hyphen-separated and space-separated inputs:

```typescript
const normalizeBelt = (belt: string): string => {
  if (!belt) return '';
  // Split by either hyphen or space, then normalize each word
  return belt.split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
```

This uses a regex `/[-\s]+/` to split by one or more hyphens or spaces.

### Verification Table

| Input | Output |
|-------|--------|
| `"green-tip"` | `"Green Tip"` |
| `"Green Tip"` | `"Green Tip"` |
| `"GREEN TIP"` | `"Green Tip"` |
| `"green tip"` | `"Green Tip"` |
| `"foundation-1"` | `"Foundation 1"` |
| `"Foundation 1"` | `"Foundation 1"` |

## Implementation

### File: `src/components/sales/CreateInvoiceDialog.tsx`

**Line 70-76**: Replace the `normalizeBelt` function with the fixed version.

## Expected Result

After this fix:
- Student "Mingyu Song" with `current_belt: "green-tip"`
- Selecting "Grading Fees" category
- Will show: "Morley - 11 Apr 2026 - 08:40 - Green Tip"

The comparison will now work correctly:
- `normalizeBelt("green-tip")` → `"Green Tip"`
- `normalizeBelt("Green Tip")` → `"Green Tip"`
- `"Green Tip" === "Green Tip"` ✓
