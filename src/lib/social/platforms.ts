export type Platform = 'instagram' | 'facebook' | 'tiktok';

export const PLATFORMS: Platform[] = ['instagram', 'facebook', 'tiktok'];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

export const PLATFORM_LIMITS: Record<Platform, { caption: number; hashtags: [number, number] }> = {
  instagram: { caption: 2200, hashtags: [15, 25] },
  facebook: { caption: 5000, hashtags: [3, 5] },
  tiktok: { caption: 150, hashtags: [4, 6] },
};

export interface PlatformCaption {
  caption: string;
  cta: string;
  hashtags: string[];
  overlay_text?: string;
  reel_title?: string;
}

export type PlatformCaptions = Partial<Record<Platform, PlatformCaption>>;
export type PostedPlatforms = Partial<Record<Platform, string>>; // ISO timestamp
