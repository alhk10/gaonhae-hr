import { supabase } from '@/integrations/supabase/client';
import type { Platform, PlatformCaptions, PostedPlatforms } from '@/lib/social/platforms';

export type PostStatus = 'draft' | 'queued' | 'posted' | 'archived';

export interface SocialPost {
  id: string;
  branch_name: string;
  content_type: string;
  status: PostStatus;
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
  target_platforms: Platform[];
  platform_captions: PlatformCaptions;
  posted_platforms: PostedPlatforms;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'sm_posts' as const;

export async function createDraftPost(patch: Partial<SocialPost>): Promise<SocialPost> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({ ...patch, status: patch.status ?? 'draft' })
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

export async function deletePost(id: string): Promise<void> {
  const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function listPosts(filters?: {
  status?: PostStatus | PostStatus[];
  branch?: string;
}): Promise<SocialPost[]> {
  let q = (supabase as any).from(TABLE).select('*').order('created_at', { ascending: false });
  if (filters?.status) {
    if (Array.isArray(filters.status)) q = q.in('status', filters.status);
    else q = q.eq('status', filters.status);
  }
  if (filters?.branch) q = q.eq('branch_name', filters.branch);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SocialPost[];
}

export async function getPost(id: string): Promise<SocialPost> {
  const { data, error } = await (supabase as any).from(TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return data as SocialPost;
}

export async function markPlatformPosted(
  id: string,
  platform: Platform,
  posted: boolean,
): Promise<SocialPost> {
  const post = await getPost(id);
  const next: PostedPlatforms = { ...(post.posted_platforms ?? {}) };
  if (posted) next[platform] = new Date().toISOString();
  else delete next[platform];

  // If every target platform now posted -> mark overall status posted; else if any -> keep queued/draft as-is
  const targets = post.target_platforms ?? [];
  const allDone = targets.length > 0 && targets.every((p) => !!next[p]);
  const anyDone = Object.keys(next).length > 0;

  let status: PostStatus = post.status;
  if (allDone) status = 'posted';
  else if (!anyDone && status === 'posted') status = post.scheduled_for ? 'queued' : 'draft';

  return updatePost(id, { posted_platforms: next, status });
}

export async function uploadMedia(
  branch: string,
  file: File,
): Promise<{ path: string; assetId: string }> {
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

export async function registerExistingMedia(
  branch: string,
  storagePath: string,
  mimeType: string,
): Promise<{ path: string; assetId: string }> {
  const kind: 'image' | 'video' | 'reel' = mimeType.startsWith('video') ? 'video' : 'image';
  const { data, error } = await (supabase as any)
    .from('sm_media_assets')
    .insert({
      branch_name: branch,
      storage_path: storagePath,
      mime_type: mimeType,
      content_kind: kind,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { path: storagePath, assetId: data.id };
}

export async function getSignedMediaUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function listPostMedia(postId: string): Promise<
  { id: string; storage_path: string; mime_type: string; content_kind: string }[]
> {
  const { data, error } = await (supabase as any)
    .from('sm_media_assets')
    .select('id, storage_path, mime_type, content_kind')
    .eq('post_id', postId);
  if (error) throw error;
  return data ?? [];
}
