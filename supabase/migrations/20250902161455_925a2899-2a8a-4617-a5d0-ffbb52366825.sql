-- Fix security issues: Enable RLS on lookup tables and add appropriate policies

-- Enable RLS on all lookup tables
ALTER TABLE public.employee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for lookup tables - these are reference data so allow read access to all authenticated users
-- but only superadmins can modify them

-- Employee types policies
CREATE POLICY "Anyone can view employee types" ON public.employee_types
  FOR SELECT USING (is_active = true);

CREATE POLICY "Superadmin can manage employee types" ON public.employee_types
  FOR ALL USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- Payment methods policies  
CREATE POLICY "Anyone can view payment methods" ON public.payment_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Superadmin can manage payment methods" ON public.payment_methods
  FOR ALL USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- Booking statuses policies
CREATE POLICY "Anyone can view booking statuses" ON public.booking_statuses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Superadmin can manage booking statuses" ON public.booking_statuses
  FOR ALL USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');

-- Attendance statuses policies
CREATE POLICY "Anyone can view attendance statuses" ON public.attendance_statuses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Superadmin can manage attendance statuses" ON public.attendance_statuses
  FOR ALL USING (get_current_user_role() = 'superadmin')
  WITH CHECK (get_current_user_role() = 'superadmin');