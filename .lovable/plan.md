

## Plan: Fix Age Exception Not Working in Attendance & Student Details

### Problem
Qi Wei has `allowed_class_types: ['Kids']` saved in the database, but:
1. **Attendance Dialog**: The `getBranchStudentsForClass` function in `classAttendanceService.ts` filters by age range but doesn't check `allowed_class_types`, so Qi Wei (age 5) is excluded from Kids class (min_age 6).
2. **Student Details Dialog**: `StudentDetailsDialog.tsx` doesn't display the `allowed_class_types` field at all.

### Changes

#### 1. `src/services/classAttendanceService.ts` — `getBranchStudentsForClass`
- Add `allowed_class_types` to the select query
- Accept a new `classType` parameter
- In the age filter, skip filtering for students whose `allowed_class_types` array includes the current `classType`

#### 2. `src/components/dashboard/SlotAttendanceDialog.tsx`
- Pass `slot.classType` to `getBranchStudentsForClass` so it can check age exceptions
- Update the query key to include `classType`

#### 3. `src/components/dashboard/StudentDetailsDialog.tsx`
- Display `allowed_class_types` in the Training Information section (e.g., as badges) when the student has class type exceptions set

### Technical Details
- The `getBranchStudentsForClass` age filter (lines 111-123) will add: if student's `allowed_class_types` includes the `classType` param, skip the age check
- The student details dialog receives `student` as a prop — need to ensure `allowed_class_types` is included when the student object is fetched (check the parent component's query)

