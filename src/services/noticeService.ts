import { supabase } from '@/integrations/supabase/client';

export interface Notice {
  id: string;
  subject: string;
  content: string | null;
  image_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_by_email: string;
  created_by_branch_id: string | null;
  target_branches: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getNotices = async (): Promise<Notice[]> => {
  const { data, error } = await supabase
    .from('notices' as any)
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Notice[];
};

export const createNotice = async (notice: Omit<Notice, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Notice> => {
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
