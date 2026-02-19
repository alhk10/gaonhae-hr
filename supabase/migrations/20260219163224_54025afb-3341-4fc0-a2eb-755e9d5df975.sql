
-- Cancel Abby's orphaned scheduled classes
UPDATE student_scheduled_classes 
SET status = 'cancelled'
WHERE enrollment_id = '903062fa-7942-43a3-a902-84aaba3fa9ab'
AND status = 'scheduled';

-- Deactivate the orphaned enrollment
UPDATE student_class_enrollments
SET status = 'inactive'
WHERE id = '903062fa-7942-43a3-a902-84aaba3fa9ab';
