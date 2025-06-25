
-- Add Row Level Security policies for the employees table
-- Since this appears to be an admin/HR system, we'll allow all operations for now
-- In a production system, you'd want more granular permissions based on user roles

-- Policy to allow SELECT (reading) employees
CREATE POLICY "Allow read access to employees" 
  ON public.employees 
  FOR SELECT 
  USING (true);

-- Policy to allow INSERT (creating) employees  
CREATE POLICY "Allow insert access to employees" 
  ON public.employees 
  FOR INSERT 
  WITH CHECK (true);

-- Policy to allow UPDATE (editing) employees
CREATE POLICY "Allow update access to employees" 
  ON public.employees 
  FOR UPDATE 
  USING (true);

-- Policy to allow DELETE (removing) employees
CREATE POLICY "Allow delete access to employees" 
  ON public.employees 
  FOR DELETE 
  USING (true);

-- Also add policies for related tables that might have RLS enabled

-- Policies for allowances table
CREATE POLICY "Allow all access to allowances" 
  ON public.allowances 
  FOR ALL 
  USING (true);

-- Policies for deductions table  
CREATE POLICY "Allow all access to deductions" 
  ON public.deductions 
  FOR ALL 
  USING (true);

-- Policies for admin_access table
CREATE POLICY "Allow all access to admin_access" 
  ON public.admin_access 
  FOR ALL 
  USING (true);

-- Policies for certificates table
CREATE POLICY "Allow all access to certificates" 
  ON public.certificates 
  FOR ALL 
  USING (true);
