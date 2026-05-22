# Show attended-but-unscheduled classes on /hello calendar

## Investigation

Student: **KAYDEN HII** (`3185114f-1e0b-416a-929e-9d6c5275bfab`), Term 2 2026 (28/04 – 03/07).

- `class_attendance`: one row on **2026-05-21**, status `present`, `timetable_id=af73474a…`, `entitlement_id` NULL. Attendance was recorded directly by staff (no scheduled booking created).
- `student_scheduled_classes` (joined via `student_class_enrollments`) for Kayden in Term 2: **none**. He has no enrollment row at all for Term 2 — only entitlements (Unlimited 10-pack, 0 used).
- The `/hello` term calendar reads bookings from `get_public_student_term_bookings`, which only returns `student_scheduled_classes`. So directly-recorded attendance never appears.

Result: the 21/05 class he attended is invisible on his calendar, even though it counts in our system.

## Fix

Extend both overloads of `get_public_student_term_bookings` to also return `class_attendance` rows for the student within the resolved term window, when no matching `student_scheduled_classes` row already covers that date+timetable.

Return shape stays the same; attendance-derived rows will be marked with `status = 'attended'` and times pulled from `class_timetables`. The frontend already renders any returned booking as a blue "your class" dot, so no UI changes are needed.

### Migration sketch

```sql
CREATE OR REPLACE FUNCTION public.get_public_student_term_bookings(
  p_session_id uuid, p_student_id uuid, p_term_id uuid
) RETURNS TABLE(...) ... AS $$
DECLARE v_branch text; v_term RECORD;
BEGIN
  -- (existing session validation + term resolution unchanged)

  RETURN QUERY
  -- existing scheduled-class rows
  SELECT sc.id, sc.scheduled_date, sc.start_time, sc.end_time, sc.timetable_id,
         sc.status, COALESCE(e.class_type, v_term.class_type)
  FROM student_scheduled_classes sc
  JOIN student_class_enrollments e ON e.id = sc.enrollment_id
  WHERE e.student_id = p_student_id
    AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
    AND sc.status NOT IN ('cancelled','swapped')

  UNION ALL

  -- attendance rows without a matching scheduled class
  SELECT ca.id, ca.class_date, ct.start_time, ct.end_time, ca.timetable_id,
         'attended'::text, ct.class_type
  FROM class_attendance ca
  JOIN class_timetables ct ON ct.id = ca.timetable_id
  WHERE ca.student_id = p_student_id
    AND ca.class_date BETWEEN v_term.start_date AND v_term.end_date
    AND ca.status IN ('present','late')
    AND NOT EXISTS (
      SELECT 1 FROM student_scheduled_classes sc2
      JOIN student_class_enrollments e2 ON e2.id = sc2.enrollment_id
      WHERE e2.student_id = p_student_id
        AND sc2.scheduled_date = ca.class_date
        AND sc2.timetable_id = ca.timetable_id
        AND sc2.status NOT IN ('cancelled','swapped')
    );
END; $$;
```

Same change applied to the two-arg overload.

## Scope

- Migration only (two RPC redefinitions). No frontend, types, or service changes.
- Kayden's 21/05 attended class will then show as a blue dot on the Term 2 2026 calendar.

## Out of scope

- Why no enrollment/scheduled class was created for Kayden in Term 2 (separate enrollment-data gap).
- Backfilling `student_scheduled_classes` rows from existing attendance history.