import { supabase } from '@/integrations/supabase/client';

export interface Caricature {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  branch_name: string | null;
  image_url: string;
  storage_path: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'sm_caricatures' as const;
const BUCKET = 'social-caricatures';

export async function listCaricatures(branch?: string, onlyActive = false): Promise<Caricature[]> {
  let q = (supabase as any).from(TABLE).select('*').order('created_at', { ascending: false });
  if (onlyActive) q = q.eq('is_active', true);
  if (branch) q = q.or(`branch_name.eq.${branch},branch_name.is.null`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Caricature[];
}

export async function uploadCaricatureImage(file: File): Promise<{ url: string; path: string }> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function createCaricature(input: {
  name: string;
  description?: string | null;
  tags?: string[];
  branch_name?: string | null;
  image_url: string;
  storage_path: string;
  is_active?: boolean;
}): Promise<Caricature> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      name: input.name,
      description: input.description ?? null,
      tags: input.tags ?? [],
      branch_name: input.branch_name ?? null,
      image_url: input.image_url,
      storage_path: input.storage_path,
      is_active: input.is_active ?? true,
      created_by: userRes.user?.email ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Caricature;
}

export async function updateCaricature(id: string, patch: Partial<Caricature>): Promise<Caricature> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Caricature;
}

export async function deleteCaricature(id: string, storagePath?: string): Promise<void> {
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  }
  const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
