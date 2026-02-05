-- Create student notification subscriptions table
CREATE TABLE public.student_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.student_notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student notification subscriptions
CREATE POLICY "Students can manage own subscriptions" 
  ON public.student_notification_subscriptions 
  FOR ALL 
  USING (student_id = public.get_current_student_id());

-- Superadmins can view all subscriptions
CREATE POLICY "Superadmins can view all subscriptions" 
  ON public.student_notification_subscriptions 
  FOR SELECT 
  USING (public.get_current_user_role() = 'superadmin');

-- Add trigger for updated_at
CREATE TRIGGER update_student_notification_subscriptions_updated_at
  BEFORE UPDATE ON public.student_notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add new chat message notification template
INSERT INTO public.notification_templates (template_key, title, body, enabled)
VALUES ('new_chat_message', 'New Message', '{sender_name}: {message_preview}', true)
ON CONFLICT (template_key) DO NOTHING;