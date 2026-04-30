import { supabase } from '@/integrations/supabase/client';

export interface SocialPost {
  id: string;
  branch_name: string;
  ig_account_id: string | null;
  content_type: string;
  status: 'draft' | 'pending' | 'approved' | 'scheduled' | 'published' | 'failed';
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  overlay_text: string | null;
  reel_title: string | null;
  event_name: string | null;
  student_name: string | null;
  instructor_name: string | null;
  notes_for_ai: string | null;
  tags: string[];
  scheduled_for: string | null;
  timezone: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'sm_posts' as const;

export async function createDraftPost(patch: Partial<SocialPost>): Promise<SocialPost> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({ ...patch, status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  return data as SocialPost;
}

export async function updatePost(id: string, patch: Partial<SocialPost>): Promise<SocialPost> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SocialPost;
}

export async function listPosts(filters?: { status?: SocialPost['status']; branch?: string }): Promise<SocialPost[]> {
  let q = (supabase as any).from(TABLE).select('*').order('created_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.branch) q = q.eq('branch_name', filters.branch);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SocialPost[];
}

export async function uploadMedia(branch: string, file: File): Promise<{ path: string; assetId: string }> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `posts/${branch}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from('social-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) throw upErr;

  const kind: 'image' | 'video' | 'reel' = file.type.startsWith('video') ? 'video' : 'image';
  const { data, error } = await (supabase as any)
    .from('sm_media_assets')
    .insert({
      branch_name: branch,
      storage_path: path,
      mime_type: file.type,
      content_kind: kind,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { path, assetId: data.id };
}

export async function getSignedMediaUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
