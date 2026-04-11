

## Plan: Hide Invoices Before 1 April 2026 in Student Portal

### Change
Filter the student portal invoice query to only return invoices created on or after 1 April 2026.

### File: `src/components/dashboard/StudentDashboard.tsx`
- **Line 123**: Add `.gte('created_at', '2026-04-01')` to the Supabase query chain, right after `.eq('student_id', studentId)` and before `.order(...)`.
- This ensures invoices dated before 1 April 2026 are excluded at the database level, so they won't appear in the Invoices tab or be counted in the tab label.

### Impact
- Only affects the Student Portal view -- branch dashboard invoice lists and invoice management pages are unchanged.
- The tab count `Invoices (N)` will automatically reflect the filtered total.

