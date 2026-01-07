-- Update the existing leave encashment allowance to include days
UPDATE allowances 
SET name = 'Leave Encashment - 10 days (2025)'
WHERE id = 47 AND name = 'Leave Encashment (2025)';