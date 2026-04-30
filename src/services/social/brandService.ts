import { supabase } from '@/integrations/supabase/client';

export type SmBranch = 'Perth' | 'Singapore';

export interface BrandSettings {
  id: string;
  branch_name: string;
  tone_of_voice: string | null;
  brand_keywords: string[];
  banned_words: string[];
  emoji_style: string | null;
  default_hashtags: string[];
  cta_style: string | null;
  target_audience: string | null;
  preferred_caption_length: string | null;
  color_palette: Record<string, unknown>;
  logo_url: string | null;
  posting_frequency: string | null;
}

const TABLE = 'sm_brand_settings' as const;

export async function listBrandSettings(): Promise<BrandSettings[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .order('branch_name');
  if (error) throw error;
  return (data ?? []) as BrandSettings[];
}

export async function getBrandSettings(branch: SmBranch): Promise<BrandSettings | null> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('branch_name', branch)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as BrandSettings | null;
}

export async function upsertBrandSettings(branch: SmBranch, patch: Partial<BrandSettings>): Promise<BrandSettings> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .upsert({ ...patch, branch_name: branch }, { onConflict: 'branch_name' })
    .select()
    .single();
  if (error) throw error;
  return data as BrandSettings;
}
