-- Create scheduled classes for Abby's new enrollments
-- Both items have slots: 081a7022_2026-03-18 and 081a7022_2026-03-25

-- Enrollment for item 5a9939f0 (id: 3652d640)
INSERT INTO student_scheduled_classes (enrollment_id, timetable_id, scheduled_date, start_time, end_time, status)
VALUES 
  ('3652d640-baac-492e-89a4-c1bae8f279de', '081a7022-c6c4-40f0-8833-1a1ecff25267', '2026-03-18', '15:30:00', '16:25:00', 'scheduled'),
  ('3652d640-baac-492e-89a4-c1bae8f279de', '081a7022-c6c4-40f0-8833-1a1ecff25267', '2026-03-25', '15:30:00', '16:25:00', 'scheduled');

-- Enrollment for item 66eb6a6a (id: b66810b3)
INSERT INTO student_scheduled_classes (enrollment_id, timetable_id, scheduled_date, start_time, end_time, status)
VALUES 
  ('b66810b3-9850-4ad1-ac89-0d57a852c2ef', '081a7022-c6c4-40f0-8833-1a1ecff25267', '2026-03-18', '15:30:00', '16:25:00', 'scheduled'),
  ('b66810b3-9850-4ad1-ac89-0d57a852c2ef', '081a7022-c6c4-40f0-8833-1a1ecff25267', '2026-03-25', '15:30:00', '16:25:00', 'scheduled');