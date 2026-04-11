
Problem I investigated:
- This is not a data-entry issue. Live Supabase data shows Hannah, Ker You, and Qi Wei all already have `allowed_class_types = ['Kids']`.
- Hannah is not missing because she was already added: she currently has no `class_attendance` rows and no `student_scheduled_classes` rows.
- Yishun Kids slots still carry timetable ages like `age_from = 7`, while branch-level Kids settings are `min_age = 6`.

Do I know what the issue is?
- Yes.

What is actually wrong:
1. Attendance eligibility is still too brittle in `classAttendanceService.ts`.
   - It only does a narrow, local age check.
   - It does not fully mirror the same exception logic used elsewhere.
   - It relies on exact class-type string matching instead of normalized matching.
   - It does not use branch class type settings, so attendance can diverge from invoicing/scheduling.

2. The UI is also stale after edits.
   - `BranchDashboard.tsx` invalidates `branch-students`, then immediately reads old cache for `selectedStudent`.
   - It does not invalidate the `branch-students-class` query used by the attendance dialog.
   - This explains why saved exceptions may not show in Student Details and may not refresh the Add Students list reliably.

Implementation plan:
1. Create one shared eligibility helper
   - Add a shared utility for:
     - normalized class type comparison (`trim + lowercase`)
     - checking whether a student has an age exception
     - evaluating final eligibility using:
       - student exception first
       - timetable age range
       - branch class type age settings
       - belt rules remain unchanged
   - Use this helper everywhere age exceptions matter so logic cannot drift again.

2. Harden attendance filtering
   - Refactor `src/services/classAttendanceService.ts` so `getBranchStudentsForClass(...)`:
     - loads branch class type settings
     - uses the shared helper
     - keeps belt filtering separate
     - only excludes students for clear reasons
   - This will make attendance behavior consistent for all students and all slots, not just the currently failing cases.

3. Fix stale student detail state after save
   - Update `EditStudentDialog.tsx` and `BranchDashboard.tsx` so the freshly updated student is pushed directly into state/cache instead of reading stale cache right after invalidation.
   - Ensure `selectedStudent` updates immediately, so the Age Exceptions badges appear without reopening or hard refresh.

4. Invalidate the right queries after student edits
   - After saving a student, invalidate:
     - `['branch-students', branchId]`
     - all `['branch-students-class', ...]` queries for that branch
   - This ensures the attendance Add Students list refreshes when an exception is added.

5. Align other age-exception paths with the shared helper
   - Update `ClassScheduleSelector.tsx`
   - Update `InvoiceDialog.tsx`
   - This removes duplicated logic and makes scheduling, invoicing, and attendance all evaluate exceptions the same way.

Files to update:
- `src/services/classAttendanceService.ts`
- `src/components/dashboard/BranchDashboard.tsx`
- `src/components/sales/EditStudentDialog.tsx`
- `src/components/dashboard/ClassScheduleSelector.tsx`
- `src/components/sales/InvoiceDialog.tsx`
- new shared helper file, e.g. `src/utils/classTypeEligibility.ts`

Technical notes:
- The root fix is not another small patch on one student.
- I will replace duplicated age-exception checks with one normalized helper.
- I will also fix React Query invalidation/state refresh so saved exceptions show immediately in both Student Details and Attendance.

QA I will do after implementation:
- Verify Hannah appears in Kids attendance Add Students and can be added
- Verify Ker You and Qi Wei also work
- Verify a student without exception and below age is still blocked
- Verify belt filtering still works
- Verify Student Details shows Age Exceptions immediately after save
- Verify the full flow end-to-end without page reload
