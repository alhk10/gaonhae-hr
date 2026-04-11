
Problem I confirmed step by step:
- Mathew Praveen is not blocked by age. He is 34, active, in branch `yishun`, with belt `Green Tip`.
- His verified invoice exists: `INV-2026-00212`.
- But there is no linked `student_class_enrollments` row and no `student_scheduled_classes` row for him.
- Attendance currently depends on two separate paths:
  1. Auto-populate path: `invoice/enrollment -> student_class_enrollments -> student_scheduled_classes -> class_attendance`
  2. Manual add path: `BranchWeeklyTimetable -> SlotAttendanceDialog -> getBranchStudentsForClass`
- So the real issue is no longer just “age exception”. The attendance flow is inconsistent across invoice, enrollment, schedule, belt filtering, and UI refresh.

Do I know what the issue is?
- Yes.

What is actually wrong:
1. Invoice creation is not reliably producing the downstream lesson records needed for attendance.
   - A student can have a valid paid/verified lesson invoice but still have no enrollment/scheduled classes.
   - That breaks auto-population entirely.

2. Manual attendance eligibility is still brittle.
   - `getBranchStudentsForClass` pushes belt filtering into SQL exact matching.
   - That is not robust for all students because belt/class strings can drift by case/spacing/format.
   - Attendance logic should use the same shared normalized rules approach already started for class type eligibility.

3. The UI gives no reason when a student is excluded.
   - “No matching students found” hides whether the student is filtered out by belt, age, branch, status, missing entitlement, or stale data.

Implementation plan:
1. Trace and fix the invoice -> enrollment -> schedule relationship
   - Review `InvoiceDialog.tsx`, `invoiceService.ts`, and `classEnrollmentService.ts`.
   - Ensure lesson invoices reliably create or update:
     - `student_class_enrollments`
     - `student_scheduled_classes`
   - Prevent “verified invoice but no attendance path” from happening again.

2. Harden attendance eligibility for all students
   - Refactor `getBranchStudentsForClass` in `classAttendanceService.ts` so it no longer relies on brittle exact SQL belt matching.
   - Fetch active branch students, then apply normalized filtering in code for:
     - branch
     - status
     - belt
     - age
     - class type exception
   - Reuse centralized helpers so attendance, invoicing, and scheduling cannot drift.

3. Add a lesson-access fallback for manual attendance
   - If a student has a valid lesson invoice/entitlement for the slot’s class type but no generated schedule rows yet, allow the student to still appear in Add Students when appropriate.
   - This makes attendance resilient even if schedule generation lags or missed a record.

4. Surface exclusion reasons in the attendance dialog
   - Add internal diagnostics so excluded students can be categorized by reason:
     - belt mismatch
     - age restriction
     - inactive status
     - wrong branch
     - no lesson entitlement/enrollment
   - Show a clearer empty/search state so future issues are debuggable without repeated guesswork.

5. Tighten refresh/invalidation across pages
   - After student edits, invoice creation, or enrollment changes, invalidate the full chain:
     - `branch-students`
     - `branch-students-class`
     - `scheduled-classes`
     - `week-attendance`
     - `slot-attendance`
   - This keeps Student Details, timetable, and Add Students in sync.

Files I expect to update:
- `src/services/classAttendanceService.ts`
- `src/services/classEnrollmentService.ts`
- `src/services/invoiceService.ts`
- `src/components/dashboard/SlotAttendanceDialog.tsx`
- `src/components/dashboard/BranchWeeklyTimetable.tsx`
- `src/components/sales/InvoiceDialog.tsx`
- possibly shared utils for normalized belt/class eligibility

Robust coding changes:
- Centralize normalized belt comparison just like class type normalization
- Stop depending on exact string equality in SQL for attendance eligibility
- Make attendance resilient when invoice data exists but schedule generation is missing
- Add explicit diagnostics instead of silent exclusion

QA I will do after implementation:
- Verify Mathew Praveen appears in Teens & Adults attendance and can be added
- Verify Hannah, Ker You, and Qi Wei still work with class-type age exceptions
- Verify a student with no valid eligibility is still correctly blocked
- Verify invoice creation produces enrollment/scheduled lesson records where required
- Verify timetable, attendance dialog, and student details refresh correctly without reload
