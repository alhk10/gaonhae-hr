-- Fix critical security issue with certificates table
-- Current policies allow ALL authenticated users to access ANY employee's certificates

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow all access to certificates" ON public.certificates;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.certificates;

-- Create secure RLS policies for certificates table
-- Policy 1: Only employees with admin access can manage all certificates
CREATE POLICY "Admins can manage all certificates"
ON public.certificates
FOR ALL
TO authenticated
USING (public.check_employee_admin_access())
WITH CHECK (public.check_employee_admin_access());

-- Policy 2: Employees can only view and manage their own certificates
CREATE POLICY "Employees manage own certificates"
ON public.certificates
FOR ALL
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
);

-- Also secure the claim-receipts storage bucket if it exists
-- Check if claim-receipts bucket has proper RLS policies
-- Drop any overly permissive storage policies
DO $$
BEGIN
  -- Remove overly permissive storage policies if they exist
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
  
  -- Create secure storage policies for claim-receipts bucket
  -- Only allow employees to upload their own receipts
  CREATE POLICY "Users can upload own claim receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'claim-receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
  
  -- Only allow employees to view their own receipts
  CREATE POLICY "Users can view own claim receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'claim-receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
  
  -- Allow employees to update/delete their own receipts
  CREATE POLICY "Users can update own claim receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'claim-receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
  
  CREATE POLICY "Users can delete own claim receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'claim-receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
  
  -- Allow admins to view all receipts
  CREATE POLICY "Admins can view all claim receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'claim-receipts' AND 
    public.check_employee_admin_access()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- If policies already exist or there are errors, continue
    NULL;
END $$;