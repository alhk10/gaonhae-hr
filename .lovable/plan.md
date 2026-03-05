

## Plan: Fix Class Filtering by Package — Revised

### Current State

The database already has `allowed_class_types` and `lessons_per_week` populated for most products. The code at line 847-848 already passes these to `ClassScheduleSelector`, which filters correctly.

**Only these products are missing the data:**

| Product | Missing fields |
|---|---|
| Little Gaonhae 1x Weekday | `allowed_class_types`, `lessons_per_week` |
| Little Gaonhae 1x Weekend | `allowed_class_types`, `lessons_per_week` |
| Little Gaonhae 2x Weekday | `allowed_class_types`, `lessons_per_week` |
| Little Gaonhae 2x Weekend | `allowed_class_types`, `lessons_per_week` |
| 1x Week | `allowed_class_types` (lessons_per_week=1 already set) |

### Changes

**1. Database update** — Populate the missing fields:
- Little Gaonhae products → `allowed_class_types: ["Little Gaonhae"]`, `lessons_per_week` extracted from name (1 or 2)
- "1x Week" already has `lessons_per_week=1` and `allowed_class_types: ["Little Gaonhae", "Kids", "Junior", "Teens & Adults"]` — this is a generic package so keep as-is or set to null (no restriction). Will set to null to allow all class types.

**2. Code change in `PaySchoolFeesDialog.tsx`** — Add a `useEffect` to clear `selectedClassSlots` when the selected package changes (so switching packages doesn't carry over invalid timeslots from a previous selection).

### Files to modify
- **Edit**: `src/components/dashboard/PaySchoolFeesDialog.tsx` — Add slot reset on package change
- **Database**: Update Little Gaonhae products to set `allowed_class_types` and `lessons_per_week`

