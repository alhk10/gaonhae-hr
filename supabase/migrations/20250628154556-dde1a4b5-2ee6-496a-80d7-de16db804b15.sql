
-- Create attendance settings table for branch-specific working hours and grace periods
CREATE TABLE public.attendance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name TEXT NOT NULL,
  monday_start TIME,
  monday_end TIME,
  tuesday_start TIME,
  tuesday_end TIME,
  wednesday_start TIME,
  wednesday_end TIME,
  thursday_start TIME,
  thursday_end TIME,
  friday_start TIME,
  friday_end TIME,
  saturday_start TIME,
  saturday_end TIME,
  sunday_start TIME,
  sunday_end TIME,
  grace_period_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger to update updated_at column
CREATE TRIGGER update_attendance_settings_updated_at
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings for main branch
INSERT INTO public.attendance_settings (
  branch_name,
  monday_start, monday_end,
  tuesday_start, tuesday_end,
  wednesday_start, wednesday_end,
  thursday_start, thursday_end,
  friday_start, friday_end,
  saturday_start, saturday_end,
  sunday_start, sunday_end,
  grace_period_minutes
) VALUES (
  'Main Branch',
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '17:00',
  '10:00', '16:00',
  15
);
