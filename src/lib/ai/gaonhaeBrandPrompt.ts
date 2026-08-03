/**
 * Gaonhae Taekwondo standard design prompt for AI marketing artwork.
 * The house style is fixed; only the event details and extra art direction vary.
 */

export type AssetFormat = 'poster' | 'square' | 'reel';

export const FORMAT_LABELS: Record<AssetFormat, string> = {
  poster: 'Poster (A4 portrait)',
  square: 'Instagram square (1:1)',
  reel: 'Instagram reel (9:16)',
};

const FORMAT_COMPOSITION: Record<AssetFormat, string> = {
  poster:
    'Vertical A4 poster composition. Strong focal illustration in the upper two thirds, generous clean white space in the lower third reserved for text and a QR code in a bottom corner.',
  square:
    'Square 1:1 Instagram feed composition. Centred focal illustration, balanced margins, clear empty space at the bottom for a short caption line.',
  reel:
    'Vertical 9:16 reel cover composition. Bold central subject, safe margins at the top and bottom so platform UI does not cover the artwork, empty space in the lower third.',
};

export const GAONHAE_BRAND_PROMPT = [
  'Design in the Gaonhae Taekwondo house style:',
  'minimalist layout on a clean white background with lots of breathing space;',
  'accent colours strictly Korean-flag red #D62828 and Korean-flag blue #005BBB, used sparingly as shapes, ribbons and highlights;',
  'subtle traditional Korean cloud and taegeuk-inspired motifs as light background decoration;',
  'cute, high-quality, modern cartoon illustrations of children in white dobok with coloured belts, performing poomsae, kicks and bows, joyful and confident expressions;',
  'bold modern geometric sans-serif typography with short impactful headings;',
  'overall feel premium, crisp and print-ready, yet warm and family friendly;',
  'no photo-realism, no clutter, no stock-photo look, no watermarks, no gibberish text.',
].join(' ');

export interface AssetDetails {
  headline?: string;
  pricing?: string;
  dateTime?: string;
  venue?: string;
  additionalDetails?: string;
  cta?: string;
  branchName?: string;
  artDirection?: string;
}

export function buildImagePrompt(format: AssetFormat, details: AssetDetails): string {
  const parts: string[] = [GAONHAE_BRAND_PROMPT, FORMAT_COMPOSITION[format]];

  const subject: string[] = [];
  if (details.headline) subject.push(`Subject / event: ${details.headline}.`);
  if (details.branchName) subject.push(`Branch: ${details.branchName}.`);
  if (details.dateTime) subject.push(`When: ${details.dateTime}.`);
  if (details.venue) subject.push(`Where: ${details.venue}.`);
  if (details.pricing) subject.push(`Pricing: ${details.pricing}.`);
  if (details.additionalDetails) subject.push(`Extra details: ${details.additionalDetails}.`);
  if (details.cta) subject.push(`Call to action: ${details.cta}.`);
  if (subject.length) parts.push(subject.join(' '));

  parts.push(
    'Render the artwork as the visual only — keep any lettering minimal and leave clear empty areas where the headline, details and QR code will be placed afterwards.',
  );

  if (details.artDirection) parts.push(`Additional art direction: ${details.artDirection}.`);

  return parts.join('\n');
}

export function buildCopyDetails(format: AssetFormat, details: AssetDetails): Record<string, string> {
  const out: Record<string, string> = { format };
  if (details.headline) out['Event / headline'] = details.headline;
  if (details.branchName) out['Branch'] = details.branchName;
  if (details.pricing) out['Pricing'] = details.pricing;
  if (details.dateTime) out['Date and time'] = details.dateTime;
  if (details.venue) out['Venue'] = details.venue;
  if (details.additionalDetails) out['Additional details'] = details.additionalDetails;
  if (details.cta) out['Call to action'] = details.cta;
  return out;
}
