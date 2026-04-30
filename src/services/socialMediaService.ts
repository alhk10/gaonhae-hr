import { supabase } from '@/integrations/supabase/client';

export type ContentType = 'achievement' | 'training' | 'educational' | 'promotion';
export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed';
export type MediaType = 'image' | 'video';

export interface BrandSettings {
  id: string;
  branch_id: string | null;
  tone: string;
  keywords: string[];
  default_hashtags: string[];
  caption_style: string;
  language: string;
  created_at?: string;
  updated_at?: string;
}

export interface SocialPost {
  id: string;
  branch_id: string;
  content_type: ContentType;
  caption: string;
  cta: string;
  hashtags: string[];
  media_url: string | null;
  media_type: MediaType | null;
  scheduled_at: string | null;
  status: PostStatus;
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  failure_reason: string | null;
  rejection_note: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------- Brand settings ----------------

export async function getBrandSettings(branchId: string | null): Promise<BrandSettings | null> {
  let q = supabase.from('brand_settings').select('*').limit(1);
  q = branchId ? q.eq('branch_id', branchId) : q.is('branch_id', null);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as BrandSettings) || null;
}

export async function listBrandSettings(): Promise<BrandSettings[]> {
  const { data, error } = await supabase.from('brand_settings').select('*');
  if (error) throw error;
  return (data || []) as BrandSettings[];
}

export async function upsertBrandSettings(
  payload: Omit<BrandSettings, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): Promise<BrandSettings> {
  const conflictTarget = 'branch_id';
  const { data, error } = await supabase
    .from('brand_settings')
    .upsert(payload, { onConflict: conflictTarget })
    .select('*')
    .single();
  if (error) throw error;
  return data as BrandSettings;
}

// ---------------- Social posts ----------------

export async function listSocialPosts(filters?: {
  branchId?: string;
  status?: PostStatus | PostStatus[];
}): Promise<SocialPost[]> {
  let q = supabase.from('social_posts').select('*').order('created_at', { ascending: false });
  if (filters?.branchId) q = q.eq('branch_id', filters.branchId);
  if (filters?.status) {
    if (Array.isArray(filters.status)) q = q.in('status', filters.status);
    else q = q.eq('status', filters.status);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as SocialPost[];
}

export async function getSocialPost(id: string): Promise<SocialPost | null> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as SocialPost) || null;
}

export async function createSocialPost(
  payload: Partial<SocialPost> & { branch_id: string; content_type: ContentType },
): Promise<SocialPost> {
  const { data, error } = await supabase
    .from('social_posts')
    .insert(payload as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as SocialPost;
}

export async function updateSocialPost(
  id: string,
  patch: Partial<SocialPost>,
): Promise<SocialPost> {
  const { data, error } = await supabase
    .from('social_posts')
    .update(patch as any)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as SocialPost;
}

export async function deleteSocialPost(id: string): Promise<void> {
  const { error } = await supabase.from('social_posts').delete().eq('id', id);
  if (error) throw error;
}

// ---------------- Storage ----------------

export async function uploadSocialMedia(
  file: File,
  branchId: string,
): Promise<{ url: string; path: string; mediaType: MediaType }> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${branchId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('social-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('social-media').getPublicUrl(path);
  const mediaType: MediaType = file.type.startsWith('video') ? 'video' : 'image';
  return { url: data.publicUrl, path, mediaType };
}

// ---------------- Edge functions ----------------

export interface GeneratedCaption {
  caption: string;
  cta: string;
  hashtags: string[];
}

export async function generateCaption(input: {
  branch_id: string;
  content_type: ContentType;
  custom_notes?: string;
}): Promise<GeneratedCaption> {
  const { data, error } = await supabase.functions.invoke('social-generate-caption', {
    body: input,
  });
  if (error) {
    const ctx: any = (error as any)?.context;
    if (ctx?.status === 429) throw new Error('AI rate limit reached. Please wait and try again.');
    if (ctx?.status === 402)
      throw new Error('AI credits exhausted. Add credits in Settings → Workspace → Usage.');
    throw error;
  }
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as GeneratedCaption;
}

export async function publishToInstagram(_postId: string): Promise<{ success: boolean; message?: string }> {
  // Auto-publishing has been removed. Use the manual export workflow under "Social Media" → "Create Post"
  // (Download media + Copy caption, then post manually).
  throw new Error(
    'Auto-publish to Instagram is disabled. Open Social Media → Create Post to download media and copy the caption for manual posting.',
  );
}

