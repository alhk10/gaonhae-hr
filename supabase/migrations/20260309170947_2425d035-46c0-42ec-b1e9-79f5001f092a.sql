-- Update Little Gaonhae timetable slots at Yishun to match branch class type age settings (3-7)
UPDATE branch_timetables 
SET age_from = 3, age_to = 7 
WHERE branch_id = 'yishun' 
AND class_type = 'Little Gaonhae' 
AND is_active = true;