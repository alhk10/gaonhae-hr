import { supabase } from '@/integrations/supabase/client';

export interface Notice {
  id: string;
  subject: string;
  content: string | null;
  image_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  link: string | null;
  delete_on: string | null;
  created_by_email: string;
  created_by_branch_id: string | null;
  target_branches: string[] | null;
  target_age_min: number | null;
  target_age_max: number | null;
  target_belt_levels: string[] | null;
  payment_product_id: string | null;
  payment_variant: string | null;
  payment_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getNotices = async (includeInactive: boolean = false): Promise<Notice[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  // First delete notices past their delete_on date
  await supabase
    .from('notices' as any)
    .delete()
    .lte('delete_on', today)
    .not('delete_on', 'is', null);

  let query = supabase
    .from('notices' as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Notice[];
};

export const createNotice = async (notice: Omit<Notice, 'id' | 'created_at' | 'updated_at' | 'is_active'> & Record<string, any>): Promise<Notice> => {
  const { data, error } = await supabase
    .from('notices' as any)
    .insert(notice as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Notice;
};

export const updateNotice = async (id: string, updates: Partial<Notice>): Promise<Notice> => {
  const { data, error } = await supabase
    .from('notices' as any)
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Notice;
};

export const deleteNotice = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notices' as any)
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const uploadNoticeFile = async (file: File, folder: string): Promise<string> => {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  
  const { error } = await supabase.storage
    .from('notice-attachments')
    .upload(fileName, file);
  if (error) throw error;

  const { data } = supabase.storage
    .from('notice-attachments')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};

export const sendNoticeNotifications = async (subject: string, targetBranches: string[] | null): Promise<void> => {
  try {
    // Build query for employees with subscriptions
    let query = supabase
      .from('notification_subscriptions')
      .select('employee_id');

    // If target branches specified, filter employees by branch access
    if (targetBranches && targetBranches.length > 0) {
      const { data: branchEmployees } = await supabase
        .from('employee_branch_access')
        .select('employee_id')
        .in('branch_id', targetBranches);
      
      const employeeIds = [...new Set((branchEmployees || []).map(e => e.employee_id))];
      if (employeeIds.length === 0) return;
      
      query = query.in('employee_id', employeeIds);
    }

    const { data: subscriptions, error } = await query;
    if (error) {
      console.error('Error fetching subscriptions for notice notifications:', error);
      return;
    }

    // Send push notification to each subscribed employee (fire and forget)
    for (const sub of subscriptions || []) {
      supabase.functions.invoke('push-notification', {
        body: {
          employee_id: sub.employee_id,
          template_key: 'new_notice',
          variables: { subject },
          url: '/'
        }
      }).catch(err => console.error('Failed to send notice notification:', err));
    }

    console.log(`Sending notice notifications to ${subscriptions?.length || 0} employees`);
  } catch (err) {
    console.error('Error sending notice notifications:', err);
  }
};
