
-- Cancel Akhil's orphaned scheduled classes
UPDATE student_scheduled_classes 
SET status = 'cancelled'
WHERE enrollment_id = 'ddfef23e-ae0f-47de-ad53-152a1376fbdc'
AND status = 'scheduled';

-- Deactivate the orphaned enrollment
UPDATE student_class_enrollments
SET status = 'inactive'
WHERE id = 'ddfef23e-ae0f-47de-ad53-152a1376fbdc';
