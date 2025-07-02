
-- Query to check all employees and their status
SELECT 
  id,
  name,
  email,
  type,
  resign_date,
  created_at,
  CASE 
    WHEN resign_date IS NULL THEN 'Active'
    ELSE 'Resigned'
  END as status
FROM employees
ORDER BY 
  CASE WHEN resign_date IS NULL THEN 0 ELSE 1 END,
  name;

-- Get count of active employees
SELECT 
  COUNT(*) as total_employees,
  COUNT(CASE WHEN resign_date IS NULL THEN 1 END) as active_employees,
  COUNT(CASE WHEN resign_date IS NOT NULL THEN 1 END) as resigned_employees
FROM employees;
