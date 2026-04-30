import { supabase } from '@/integrations/supabase/client';
import type { SmBranch } from './brandService';
import type { Platform, PlatformCaption } from '@/lib/social/platforms';

export type RegenMode =
  | 'initial'
  | 'shorter'
  | 'professional'
  | 'exciting'
  | 'family-friendly'
  | 'tone-test';

export interface GenerateCaptionInput {
  branch: SmBranch;
  content_type: string;
  platforms: Platform[];
  event_name?: string;
  student_name?: string;
  instructor_name?: string;
  notes_for_ai?: string;
  tags?: string[];
  mode?: RegenMode;
  /** When refining via shorter/professional/etc., the platform whose caption is being rewritten */
  refine_platform?: Platform;
  current_caption?: string;
}

export type CaptionResponse = Partial<Record<Platform, PlatformCaption>>;

export async function generateCaption(input: GenerateCaptionInput): Promise<CaptionResponse> {
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
  return data as CaptionResponse;
}
