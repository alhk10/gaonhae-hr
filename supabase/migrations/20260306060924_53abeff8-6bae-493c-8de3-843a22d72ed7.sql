ALTER TABLE public.class_attendance 
DROP CONSTRAINT class_attendance_attendance_method_check;

ALTER TABLE public.class_attendance 
ADD CONSTRAINT class_attendance_attendance_method_check 
CHECK (attendance_method = ANY (ARRAY['manual', 'scan', 'app', 'kiosk', 'auto_scheduled']));