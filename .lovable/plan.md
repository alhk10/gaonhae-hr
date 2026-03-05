

## Plan: Filter Classes by Product Configuration (Belt, Days, Class Types)

### Problem
The product table already has all the configuration fields populated (`allowed_class_types`, `lessons_per_week`, `lesson_days`, `allowed_belt_levels`), and the query fetches `SELECT *`, but:
1. **Available days** (`lesson_days`) are not passed to or filtered by `ClassScheduleSelector` — so classes on Friday/Saturday/Sunday still show for weekday-only packages.
2. **Belt level requirements** (`allowed_belt_levels`) are not used to filter the package dropdown — students see packages they're not eligible for.
3. **Class type filtering** already works via `allowedClassTypes` prop.

### Changes

**File: `src/components/dashboard/ClassScheduleSelector.tsx`**
1. Add a new optional prop `allowedDays?: string[]` (e.g., `["Monday", "Tuesday", "Wednesday", "Thursday"]`).
2. In the `eligibleClasses` filter, map each day name to its weekday number (Monday=1, ..., Sunday=0) and exclude classes whose `weekday` is not in the allowed set.

**File: `src/components/dashboard/PaySchoolFeesDialog.tsx`**
1. Filter `classProducts` in the package dropdown to only show products where the student's `current_belt` is in the product's `allowed_belt_levels` (or `allowed_belt_levels` is null/empty, meaning no restriction).
2. Pass `selectedProduct?.lesson_days` as the new `allowedDays` prop to `ClassScheduleSelector`.

### Day name to weekday number mapping
```text
Monday    → 1
Tuesday   → 2
Wednesday → 3
Thursday  → 4
Friday    → 5
Saturday  → 6
Sunday    → 0
```

### Files to modify
- **Edit**: `src/components/dashboard/ClassScheduleSelector.tsx` — Add `allowedDays` prop and filter
- **Edit**: `src/components/dashboard/PaySchoolFeesDialog.tsx` — Filter packages by belt level, pass `allowedDays`

