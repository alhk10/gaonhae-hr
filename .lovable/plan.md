

## Revised Plan

### 1. Fix: Cleared attendance timing should show 0 duration and 0 pay
*(Already implemented — no further action needed)*

### 2. Show display name instead of first name in Branch Casual Schedule

**File**: `src/components/dashboard/BranchCasualSchedule.tsx`

**Change**: Update the name lookup map (line 101-102) to prioritize `display_name` over `first_name`:

```typescript
// Before
const firstNameMap = new Map(casualEmployees.map(e => [e.id, e.first_name || e.name]));

// After
const displayNameMap = new Map(casualEmployees.map(e => [e.id, e.display_name || e.first_name || e.name]));
```

Then update all references from `firstNameMap` to `displayNameMap` (lines 234 and 250).

### 3. Make calendar compact with flexible row heights

**File**: `src/components/dashboard/BranchCasualSchedule.tsx`

- Remove `min-h-[80px]` from empty padding cells and day cells
- Empty cells: use `min-h-[28px]`
- Day cells: let content determine height naturally
- Reduce cell padding from `p-1` to `p-0.5`
- Use smaller font sizes for booking names on mobile (`text-[9px]`)
- Single-letter day headers on small screens, 3-letter on larger

