
-- Add DELETE policy for payroll_records table
-- This allows authenticated users to delete payroll records
CREATE POLICY "Users can delete payroll records" 
ON public.payroll_records 
FOR DELETE 
USING (true);
