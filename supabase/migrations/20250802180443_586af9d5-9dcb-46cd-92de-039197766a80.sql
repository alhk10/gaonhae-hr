-- Create a function to consolidate individual payroll records into a period record
CREATE OR REPLACE FUNCTION consolidate_july_2025_payroll()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  individual_records RECORD;
  full_time_employees JSONB := '[]'::jsonb;
  casual_employees JSONB := '[]'::jsonb;
  employee_data JSONB;
BEGIN
  -- Collect all individual July 2025 payroll records
  FOR individual_records IN 
    SELECT pr.*, e.type as employee_type, e.name as employee_name
    FROM payroll_records pr
    JOIN employees e ON pr.employee_id = e.id
    WHERE pr.month = 'July 2025' AND pr.status = 'draft'
  LOOP
    -- Extract the payroll data and add employee info
    employee_data := individual_records.payroll_data || jsonb_build_object(
      'employeeId', individual_records.employee_id,
      'name', individual_records.employee_name,
      'type', individual_records.employee_type
    );
    
    -- Add to appropriate array based on employee type
    IF individual_records.employee_type = 'Full-Time' THEN
      full_time_employees := full_time_employees || jsonb_build_array(employee_data);
    ELSE
      casual_employees := casual_employees || jsonb_build_array(employee_data);
    END IF;
  END LOOP;
  
  -- Create the consolidated period record
  INSERT INTO payroll_records (
    id,
    employee_id,
    month,
    year,
    status,
    payroll_data,
    created_at,
    updated_at
  ) VALUES (
    'PERIOD_2025-07',
    'SYSTEM',
    '2025-07',
    2025,
    'draft',
    jsonb_build_object(
      'fullTimeEmployees', full_time_employees,
      'casualEmployees', casual_employees,
      'status', 'draft',
      'period', '2025-07',
      'consolidatedAt', now()
    ),
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    payroll_data = EXCLUDED.payroll_data,
    updated_at = now();
  
  -- Log the consolidation
  RAISE NOTICE 'Consolidated % full-time and % casual employees for July 2025', 
    jsonb_array_length(full_time_employees), 
    jsonb_array_length(casual_employees);
END;
$$;

-- Execute the consolidation
SELECT consolidate_july_2025_payroll();