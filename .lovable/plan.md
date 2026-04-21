

## Plan: Retire Class Type Age Settings (superseded by per-student exceptions + timetable age range)

Branch-level `branch_class_type_settings` (the dialog shown in the screenshot) is now redundant. Age eligibility is already enforced by:
- The **timetable slot's** own `age_from`/`age_to` (per-class definition)
- The **product's** `min_age`/`max_age`
- The student's **`allowed_class_types`** array (per-student exceptions)

We will remove the branch-level layer entirely.

### Code removals

**Delete files**
- `src/components/dashboard/BranchClassTypeAgeSettings.tsx`
- `src/services/branchClassTypeSettingsService.ts`

**`src/components/dashboard/BranchDashboard.tsx`**
- Remove import of `BranchClassTypeAgeSettings`.
- Remove `classTypeSettingsOpen` state and the `<BranchClassTypeAgeSettings />` render.
- Remove the header "Settings" button that opened the dialog (lines 911–914) — no replacement; the simplified header just shows the branch name.

**`src/components/sales/InvoiceDialog.tsx`**
- Remove `classTypeAgeSettings` state, `loadClassTypeAgeSettings`, and both call sites (initial mount with `lockedBranchId` and on branch change).
- Drop the `classTypeAgeSettings` parameter from `isProductAvailableForAge` and stop calling that helper. Product age eligibility now uses only `product.min_age`/`product.max_age` (the existing `productAgeOk` line is sufficient).
- Remove `classTypeAgeSettings` from the dependency array of the disabled-products `useMemo`.

**`src/components/dashboard/ClassScheduleSelector.tsx`**
- Remove import of `getBranchClassTypeSettings` and the `classTypeAgeSettings` query.
- In `eligibleClasses`, drop the "branch class type age settings" branch (lines 99–105); keep the timetable-level `age_from`/`age_to` check and the `hasClassTypeException` short-circuit.

**`src/services/classAttendanceService.ts`**
- Remove the import of `getBranchClassTypeSettings`.
- In both `getBranchStudentsForClass` and `getExcludedStudentsDiagnostics`: delete the `branchMinAge`/`branchMaxAge` lookup blocks and stop passing those props into `isStudentEligibleForClass` / `checkFullEligibility`.

**`src/utils/classTypeEligibility.ts`**
- Remove `branchMinAge` / `branchMaxAge` from `isStudentEligibleForClass` and `checkFullEligibility` signatures and from their internal age checks. Update JSDoc.

**`src/components/sales/EditStudentDialog.tsx`**
- Stop sourcing the "Class Type Exceptions" multi-select options from the deleted settings table. Switch to the static `CLASS_TYPES` list from `@/services/branchTimetableService` so age-exception checkboxes still render for every supported class type.
- Remove the `useQuery(['branch-class-type-settings', ...])` block and the `getBranchClassTypeSettings` import.

### Database migration

New migration `drop_branch_class_type_settings.sql`:
```sql
DROP TABLE IF EXISTS public.branch_class_type_settings CASCADE;
```
(`CASCADE` cleans the trigger and policies. `src/integrations/supabase/types.ts` will regenerate automatically.)

### Verification

- Open any Branch Dashboard → no "Settings" button in the header, no dialog opens. Page loads without errors.
- Edit Student → "Class Type Exceptions (Age Override)" still lists all 10 class types from `CLASS_TYPES`. Saving exceptions still writes to `students.allowed_class_types`.
- Create Invoice for a student → product disabling still respects `product.min_age/max_age` and student belt; products no longer disabled by the removed branch setting.
- Slot Attendance → "Add Students" eligibility filter still excludes by belt + timetable age range + per-student exceptions.
- Class Schedule Selector (used in invoice/portal slot-pick) → eligible classes still respect the timetable slot's `age_from/age_to` and per-student exceptions.
- Supabase: `branch_class_type_settings` table is gone; no orphan references in `types.ts`.

### Out of scope

- Migrating any existing rows in `branch_class_type_settings` into per-student `allowed_class_types`. (User confirmed exceptions supersede it; existing rows are dropped with the table.)
- Changing the timetable slot `age_from`/`age_to` UI or the product `min_age`/`max_age` UI — both stay as the remaining age controls.

