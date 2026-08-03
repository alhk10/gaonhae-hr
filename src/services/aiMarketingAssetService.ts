import { supabase } from '@/integrations/supabase/client';
import { createParser } from 'eventsource-parser';
import { flushSync } from 'react-dom';
import type { AssetFormat } from '@/lib/ai/gaonhaeBrandPrompt';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-marketing-asset`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BUCKET = 'payment-proofs';
const FOLDER = 'marketing-assets';

export interface GeneratedCopy {
  headline: string;
  subheadline: string;
  body: string;
  caption: string;
  hashtags: string[];
}

export interface MarketingAssetRow {
  id: string;
  branch_id: string | null;
  format: string;
  inputs: any;
  copy: any;
  qr_choice: string | null;
  logo_choice: string | null;
  model: string | null;
  reference_paths: string[] | null;
  image_path: string | null;
  created_by_email: string | null;
  created_at: string;
}

const headers = () => ({
  'Content-Type': 'application/json',
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
});

export async function generateCopy(
  password: string,
  format: AssetFormat,
  details: Record<string, string>,
): Promise<GeneratedCopy> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ password, mode: 'copy', format, details }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Copy generation failed (${res.status})`);
  return {
    headline: data.headline ?? '',
    subheadline: data.subheadline ?? '',
    body: data.body ?? '',
    caption: data.caption ?? '',
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
  };
}

/** Streams the image; onFrame is called for every partial and the final frame. */
export async function generateImage(
  password: string,
  format: AssetFormat,
  prompt: string,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ password, mode: 'image', format, prompt }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let msg = text;
    try {
      msg = JSON.parse(text)?.error ?? text;
    } catch {}
    throw new Error(msg || `Image generation failed (${res.status})`);
  }

  let sawCompleted = false;
  let streamError: string | undefined;

  const parser = createParser({
    onEvent(event) {
      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (event.event === 'error' || payload?.type === 'error') {
        streamError = payload?.error?.message || 'Image generation failed';
        return;
      }
      const isPartial =
        event.event === 'image_generation.partial_image' ||
        payload?.type === 'image_generation.partial_image';
      const isFinal =
        event.event === 'image_generation.completed' ||
        payload?.type === 'image_generation.completed';
      if (!isPartial && !isFinal) return;
      if (!payload?.b64_json) return;
      flushSync(() => {
        onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  if (streamError) throw new Error(streamError);
  if (!sawCompleted) throw new Error('Image stream ended without a completed image');
}

export async function uploadGeneratedImage(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${FOLDER}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/png',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getAssetUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function saveAsset(input: {
  branch_id: string | null;
  format: string;
  inputs: any;
  copy: any;
  qr_choice: string | null;
  image_path: string | null;
}): Promise<MarketingAssetRow> {
  const { data, error } = await (supabase as any)
    .from('ai_marketing_assets')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as MarketingAssetRow;
}

export async function listAssets(limit = 30): Promise<MarketingAssetRow[]> {
  const { data, error } = await (supabase as any)
    .from('ai_marketing_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MarketingAssetRow[];
}

export async function deleteAsset(row: MarketingAssetRow): Promise<void> {
  if (row.image_path) {
    await supabase.storage.from(BUCKET).remove([row.image_path]);
  }
  const { error } = await (supabase as any).from('ai_marketing_assets').delete().eq('id', row.id);
  if (error) throw error;
}
