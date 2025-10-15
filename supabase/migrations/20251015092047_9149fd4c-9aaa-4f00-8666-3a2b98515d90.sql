-- Add missing INSERT policy for weekly_slot_config table
-- This allows authenticated users to insert new weekly slot configurations

CREATE POLICY "Users can insert weekly slot config" 
ON public.weekly_slot_config 
FOR INSERT 
WITH CHECK (true);

-- Also ensure superadmin can manage weekly slot config with all operations
CREATE POLICY "Superadmin can manage weekly slot config" 
ON public.weekly_slot_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users 
    WHERE employee_email = auth.email() AND is_active = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.superadmin_users 
    WHERE employee_email = auth.email() AND is_active = true
  )
);