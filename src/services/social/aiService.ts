import { supabase } from '@/integrations/supabase/client';
import type { SmBranch } from './brandService';

export type RegenMode =
  | 'initial'
  | 'shorter'
  | 'professional'
  | 'exciting'
  | 'family-friendly'
  | 'tone-test';

export interface CaptionPayload {
  caption: string;
  cta: string;
  hashtags: string[];
  overlay_text: string;
  reel_title: string;
}

export interface GenerateCaptionInput {
  branch: SmBranch;
  content_type: string;
  event_name?: string;
  student_name?: string;
  instructor_name?: string;
  notes_for_ai?: string;
  tags?: string[];
  mode?: RegenMode;
  current_caption?: string;
}

export async function generateCaption(input: GenerateCaptionInput): Promise<CaptionPayload> {
  const { data, error } = await supabase.functions.invoke('social-generate-caption', {
    body: input,
  });
  if (error) {
    const msg = (error as any)?.context?.error || error.message || 'AI caption generation failed';
    throw new Error(msg);
  }
  if (!data || (data as any).error) {
    throw new Error((data as any)?.error || 'AI caption generation failed');
  }
  return data as CaptionPayload;
}
