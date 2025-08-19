-- Add RLS policies to allow employees to insert and update their own attendance records

-- Policy to allow employees to insert their own attendance records (for clock-in)
CREATE POLICY "Employees can insert own attendance" 
ON public.attendance 
FOR INSERT 
WITH CHECK (employee_id = get_current_employee_id());

-- Policy to allow employees to update their own attendance records (for clock-out)
CREATE POLICY "Employees can update own attendance" 
ON public.attendance 
FOR UPDATE 
USING (employee_id = get_current_employee_id());