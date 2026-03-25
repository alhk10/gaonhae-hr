

## Plan: Open Student Detail Dialog from Grading Tab

### Problem
Clicking a student name on the Branch Dashboard's Grading tab navigates to `/parties/student/{id}` (party management page). It should instead open the same `StudentDetailsDialog` used by the Students tab.

### Changes

#### 1. `src/components/dashboard/BranchGradingList.tsx`
- Add an `onStudentClick?: (studentId: string) => void` callback prop.
- Replace `navigate(`/parties/student/${student.student_id}`)` on both desktop (line 543) and mobile (line 733) with a call to `onStudentClick(student.student_id)`.
- Remove the `useNavigate` import if no longer needed elsewhere in the file.

#### 2. `src/components/dashboard/BranchDashboard.tsx`
- Pass a new `onStudentClick` handler to `<BranchGradingList>` that:
  1. Fetches the student record from the `branch-students` query cache (or from Supabase if not cached).
  2. Sets `selectedStudent` and opens `studentDetailsOpen` — reusing the existing dialog instance.

### Result
Student names in the grading tab will open the same compact detail dialog (with personal info, contact, emergency contact, training info, invoices, attendance) as the students tab, staying within the branch dashboard context.

