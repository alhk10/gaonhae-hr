-- Fix Abby's duplicate enrollment: deactivate old enrollment and cancel its scheduled classes
UPDATE student_scheduled_classes 
SET status = 'cancelled' 
WHERE enrollment_id = '83d96462-0a60-4610-b4b3-015c11101db3' 
AND status = 'scheduled';

UPDATE student_class_enrollments 
SET status = 'inactive' 
WHERE id = '83d96462-0a60-4610-b4b3-015c11101db3';