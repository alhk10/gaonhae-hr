import { supabase } from "@/integrations/supabase/client";

export interface NotificationTemplate {
  id: string;
  template_key: string;
  title: string;
  body: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const getNotificationTemplates = async (): Promise<NotificationTemplate[]> => {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .order('template_key');

  if (error) {
    console.error('Error fetching notification templates:', error);
    throw error;
  }

  return data || [];
};

export const getNotificationTemplate = async (
  templateKey: string
): Promise<NotificationTemplate | null> => {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('template_key', templateKey)
    .maybeSingle();

  if (error) {
    console.error('Error fetching notification template:', error);
    throw error;
  }

  return data;
};

export const updateNotificationTemplate = async (
  templateKey: string,
  updates: Partial<Pick<NotificationTemplate, 'title' | 'body' | 'enabled'>>
): Promise<NotificationTemplate> => {
  const { data, error } = await supabase
    .from('notification_templates')
    .update(updates)
    .eq('template_key', templateKey)
    .select()
    .single();

  if (error) {
    console.error('Error updating notification template:', error);
    throw error;
  }

  return data;
};

export const resetNotificationTemplate = async (
  templateKey: string
): Promise<NotificationTemplate> => {
  const defaults: Record<string, { title: string; body: string }> = {
    clock_out_reminder: {
      title: 'Time to Clock Out!',
      body: 'You have been clocked in for {hours} hours. Remember to clock out when you finish your shift.'
    },
    tomorrow_slot_reminder: {
      title: 'Slot Booking Tomorrow',
      body: 'Reminder: You have a slot booked tomorrow at {branch} on {date}. Please arrive on time!'
    },
    booking_reminder: {
      title: 'Time to Book Your Slots',
      body: "Don't forget to book your work slots for the upcoming period. Book now to secure your preferred dates!"
    }
  };

  const defaultValues = defaults[templateKey];
  if (!defaultValues) {
    throw new Error(`Unknown template key: ${templateKey}`);
  }

  return updateNotificationTemplate(templateKey, {
    ...defaultValues,
    enabled: true
  });
};

// Template variable placeholders documentation
export const TEMPLATE_VARIABLES = {
  clock_out_reminder: [
    { variable: '{hours}', description: 'Number of hours clocked in' },
    { variable: '{employee_name}', description: 'Employee name' }
  ],
  tomorrow_slot_reminder: [
    { variable: '{branch}', description: 'Branch name' },
    { variable: '{date}', description: 'Booking date' },
    { variable: '{employee_name}', description: 'Employee name' }
  ],
  booking_reminder: [
    { variable: '{employee_name}', description: 'Employee name' },
    { variable: '{period}', description: 'Booking period (e.g., "1st-14th" or "15th-28th")' }
  ]
};

export const formatNotificationBody = (
  body: string,
  variables: Record<string, string>
): string => {
  let formattedBody = body;
  for (const [key, value] of Object.entries(variables)) {
    formattedBody = formattedBody.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return formattedBody;
};
