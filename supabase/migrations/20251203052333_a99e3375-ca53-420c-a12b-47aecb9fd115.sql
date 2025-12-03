-- Purge all payroll records before November 2025
DELETE FROM payroll_records 
WHERE (year < 2025) 
   OR (year = 2025 AND month NOT IN ('November', 'December'));