-- Fix RLS policies for attendance_settings table
CREATE POLICY "superadmin_manage_attendance_settings" 
ON public.attendance_settings 
FOR ALL 
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "view_attendance_settings" 
ON public.attendance_settings 
FOR SELECT 
USING (true);