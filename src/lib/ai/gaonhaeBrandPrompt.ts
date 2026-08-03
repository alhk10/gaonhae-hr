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
    'Vertical A4 poster composition. Strong focal illustration in the upper two thirds, generous clean white space in the lower third for the typeset text, and a clear empty square in a bottom corner reserved for a QR code.',
  square:
    'Square 1:1 Instagram feed composition. Centred focal illustration, balanced margins, headline and key details typeset cleanly in the lower area.',
  reel:
    'Vertical 9:16 reel cover composition. Bold central subject, safe margins at the top and bottom so platform UI does not cover the artwork, headline typeset in the lower third.',
};

export const GAONHAE_BRAND_PROMPT = [
  'Design in the Gaonhae Taekwondo house style:',
  'minimalist layout on a clean white background with lots of breathing space;',
  'accent colours strictly Korean-flag red #D62828 and Korean-flag blue #005BBB, used sparingly as shapes, ribbons and highlights;',
  'subtle traditional Korean cloud and taegeuk-inspired motifs as light background decoration;',
  'cute, high-quality, modern cartoon illustrations of children in white dobok with coloured belts, performing poomsae, kicks and bows, joyful and confident expressions;',
  'bold modern geometric sans-serif typography with short impactful headings;',
  'overall feel premium, crisp and print-ready, yet warm and family friendly;',
  'no photo-realism, no clutter, no stock-photo look, no watermarks.',
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

/** The detail fields that are typeset into the artwork itself. */
export const TEXT_FIELD_KEYS: (keyof AssetDetails)[] = [
  'headline',
  'pricing',
  'dateTime',
  'venue',
  'additionalDetails',
  'cta',
];

function textLines(details: AssetDetails): string[] {
  const lines: string[] = [];
  if (details.headline) lines.push(`Headline (largest text): "${details.headline}"`);
  if (details.dateTime) lines.push(`Date and time: "${details.dateTime}"`);
  if (details.venue) lines.push(`Venue: "${details.venue}"`);
  if (details.pricing) lines.push(`Price: "${details.pricing}"`);
  if (details.additionalDetails) lines.push(`Details: "${details.additionalDetails}"`);
  if (details.cta) lines.push(`Call to action: "${details.cta}"`);
  return lines;
}

export function buildImagePrompt(format: AssetFormat, details: AssetDetails): string {
  const parts: string[] = [GAONHAE_BRAND_PROMPT, FORMAT_COMPOSITION[format]];

  if (details.branchName) parts.push(`Branch: ${details.branchName}.`);

  const lines = textLines(details);
  if (lines.length) {
    parts.push(
      [
        'Typeset the following text into the design exactly as written, spelled character for character, with no extra or invented words, using the house typography and a clear visual hierarchy:',
        ...lines.map((l) => `- ${l}`),
        'All lettering must be crisp, correctly spelled and legible.',
      ].join('\n'),
    );
  }

  parts.push('Leave a clean empty area in one bottom corner for a QR code and one top corner for a logo.');

  if (details.artDirection) parts.push(`Additional art direction: ${details.artDirection}.`);

  return parts.join('\n');
}

/** Instruction for changing only the lettering of an existing artwork. */
export function buildTextEditPrompt(details: AssetDetails): string {
  const lines = textLines(details);
  return [
    'Edit this existing artwork by changing ONLY the text.',
    'Keep the illustration, characters, layout, composition, colours and background pixel-for-pixel identical.',
    'Replace the lettering with exactly the following, spelled character for character, keeping the same typographic style and hierarchy:',
    ...lines.map((l) => `- ${l}`),
    'Do not add, remove or move any illustration element.',
  ].join('\n');
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
