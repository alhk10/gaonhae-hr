import { supabase } from '@/integrations/supabase/client';
import { accessPassword } from '@/utils/accessBranchScope';

export interface LimitedEditionProduct {
  id: string;
  name: string;
  description: string | null;
  image_urls: string[];
  sizes: string[];
  designs: string[];
  /** Listed price; Singapore branches add GST on top at checkout. */
  price: number;
  branch_ids: string[] | null;
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  stock_limit: number | null;
  product_id: string | null;
  sold?: number;
  remaining?: number | null;
}

/** Cart key for a limited edition line: le:<id>:<design>:<size>. */
export const limitedEditionKey = (id: string, design: string, size: string) => `le:${id}:${design}:${size}`;
export const isLimitedEditionKey = (key: string | undefined | null) => !!key && key.startsWith('le:');

export const listLimitedEditionsAdmin = async (): Promise<LimitedEditionProduct[]> => {
  const { data, error } = await supabase.rpc('access_limited_edition_list' as any, { p_password: accessPassword() });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({ ...r, price: Number(r.price) }));
};

export const saveLimitedEdition = async (row: Partial<LimitedEditionProduct>): Promise<string> => {
  const { data, error } = await supabase.rpc('access_limited_edition_upsert' as any, { p_password: accessPassword(), p_row: row as any });
  if (error) throw error;
  return data as string;
};

export const deleteLimitedEdition = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc('access_limited_edition_delete' as any, { p_password: accessPassword(), p_id: id });
  if (error) throw error;
};

export const getPublicLimitedEditions = async (branchId: string): Promise<LimitedEditionProduct[]> => {
  const { data, error } = await supabase.rpc('get_public_limited_editions' as any, { p_branch_id: branchId });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({ ...r, price: Number(r.price), image_urls: r.image_urls || [], sizes: r.sizes || [], designs: r.designs || [] }));
};

export const uploadLimitedEditionImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be 10 MB or smaller');
  const safe = file.name.replace(/[^a-z0-9._-]/gi, '_');
  const path = `public-limited/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  const { data, error: sErr } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (sErr || !data?.signedUrl) throw new Error('Could not create image link');
  return data.signedUrl;
};
