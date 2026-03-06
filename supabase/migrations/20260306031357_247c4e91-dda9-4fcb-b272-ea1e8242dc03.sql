-- Fix existing enrollments: update class_type from product name to timetable class_type
UPDATE student_class_enrollments sce
SET class_type = bt.class_type, updated_at = NOW()
FROM student_scheduled_classes ssc
JOIN branch_timetables bt ON bt.id = ssc.timetable_id
WHERE ssc.enrollment_id = sce.id
  AND sce.status = 'active'
  AND sce.class_type != bt.class_type
  AND ssc.timetable_id IS NOT NULL;