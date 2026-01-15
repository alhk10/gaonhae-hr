-- Create notification_subscriptions table for storing push notification subscriptions
CREATE TABLE public.notification_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, endpoint)
);

-- Create notification_templates table for superadmin-editable content
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_logs table to prevent duplicate notifications
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS on all tables
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_subscriptions
CREATE POLICY "Employees can view their own subscriptions"
  ON public.notification_subscriptions FOR SELECT
  USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Employees can insert their own subscriptions"
  ON public.notification_subscriptions FOR INSERT
  WITH CHECK (employee_id = public.get_current_employee_id());

CREATE POLICY "Employees can delete their own subscriptions"
  ON public.notification_subscriptions FOR DELETE
  USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Superadmins can view all subscriptions"
  ON public.notification_subscriptions FOR SELECT
  USING (public.get_current_user_role() = 'superadmin');

-- RLS policies for notification_templates (superadmin only for writes, all can read)
CREATE POLICY "Anyone can read notification templates"
  ON public.notification_templates FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage notification templates"
  ON public.notification_templates FOR ALL
  USING (public.get_current_user_role() = 'superadmin');

-- RLS policies for notification_logs
CREATE POLICY "Employees can view their own notification logs"
  ON public.notification_logs FOR SELECT
  USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Superadmins can view all notification logs"
  ON public.notification_logs FOR SELECT
  USING (public.get_current_user_role() = 'superadmin');

-- Insert default notification templates
INSERT INTO public.notification_templates (template_key, title, body, enabled) VALUES
  ('clock_out_reminder', 'Time to Clock Out!', 'You have been clocked in for {hours} hours. Remember to clock out when you finish your shift.', true),
  ('tomorrow_slot_reminder', 'Slot Booking Tomorrow', 'Reminder: You have a slot booked tomorrow at {branch} on {date}. Please arrive on time!', true),
  ('booking_reminder', 'Time to Book Your Slots', 'Don''t forget to book your work slots for the upcoming period. Book now to secure your preferred dates!', true);

-- Create trigger for updated_at on notification_subscriptions
CREATE TRIGGER update_notification_subscriptions_updated_at
  BEFORE UPDATE ON public.notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on notification_templates
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_notification_subscriptions_employee_id ON public.notification_subscriptions(employee_id);
CREATE INDEX idx_notification_logs_employee_template ON public.notification_logs(employee_id, template_key, sent_at);