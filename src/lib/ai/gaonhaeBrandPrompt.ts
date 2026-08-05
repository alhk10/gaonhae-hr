/**
 * Gaonhae Taekwondo standard design prompt for AI marketing artwork.
 * The house style is fixed; only the event details and extra art direction vary.
 */

export type AssetFormat = 'poster' | 'square' | 'reel' | 'custom';

export const FORMAT_LABELS: Record<AssetFormat, string> = {
  poster: 'Poster (A4 portrait)',
  square: 'Instagram square (1:1)',
  reel: 'Instagram reel (9:16)',
  custom: 'Custom size (cm)',
};

export interface CustomSize {
  widthCm: number;
  heightCm: number;
}

export const CUSTOM_SIZE_DEFAULT: CustomSize = { widthCm: 21, heightCm: 29.7 };
export const CUSTOM_SIZE_MIN = 5;
export const CUSTOM_SIZE_MAX = 200;

export const isValidCustomSize = (s?: Partial<CustomSize> | null): boolean =>
  !!s &&
  Number.isFinite(s.widthCm) &&
  Number.isFinite(s.heightCm) &&
  (s.widthCm as number) >= CUSTOM_SIZE_MIN &&
  (s.widthCm as number) <= CUSTOM_SIZE_MAX &&
  (s.heightCm as number) >= CUSTOM_SIZE_MIN &&
  (s.heightCm as number) <= CUSTOM_SIZE_MAX;

const trimNum = (n: number) => String(Math.round(n * 10) / 10);

export const formatLabelFor = (format: AssetFormat, size?: CustomSize | null): string =>
  format === 'custom' && size
    ? `Custom ${trimNum(size.widthCm)} x ${trimNum(size.heightCm)} cm`
    : FORMAT_LABELS[format] || format;

function customComposition(size: CustomSize): string {
  const ratio = size.widthCm / size.heightCm;
  const orientation = ratio > 1.05 ? 'landscape' : ratio < 0.95 ? 'portrait' : 'square';
  return (
    `Print artwork designed for a ${trimNum(size.widthCm)} cm wide by ${trimNum(size.heightCm)} cm tall ${orientation} sheet ` +
    `(aspect ratio ${ratio.toFixed(2)}:1). Illustration and typography are designed together across the whole sheet — ` +
    'the headline anchored into the artwork with a ribbon, banner or colour block, supporting details grouped into designed info bands, ' +
    'and generous print-safe margins on all edges so nothing important is trimmed. No leftover blank text zone.'
  );
}

const FORMAT_COMPOSITION: Record<Exclude<AssetFormat, 'custom'>, string> = {
  poster:
    'Vertical A4 poster composition. Illustration and typography are designed together across the whole sheet — the headline anchored into the artwork with a ribbon, banner or colour block, supporting details grouped into designed info bands, and a clear empty square in a bottom corner reserved for a QR code. No leftover blank text zone.',
  square:
    'Square 1:1 Instagram feed composition. Illustration and typography interlock across the full frame within balanced margins — text woven around and over the artwork in designed shapes, not stacked in a blank strip.',
  reel:
    'Vertical 9:16 reel cover composition. Bold central subject with the typography integrated into the artwork across the frame, keeping safe margins at the top and bottom so platform UI does not cover the design. No blank caption band.',
};


/** Poster composition when the QR/logo are blended into the design by the model. */
const POSTER_COMPOSITION_BLENDED =
  'Vertical A4 poster composition. Illustration and typography are designed together across the whole sheet — the headline anchored into the artwork with a ribbon, banner or colour block, supporting details grouped into designed info bands. No leftover blank text zone.';


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

export interface ImagePromptOptions {
  /** True when the supplied QR/logo images are sent to the model to integrate. */
  blendAssets?: boolean;
  hasQr?: boolean;
  hasLogo?: boolean;
  /** Target print size when format === 'custom'. */
  customSize?: CustomSize | null;
}


function blendBlock(opts: ImagePromptOptions): string {
  const lines: string[] = [
    'The supplied brand asset images must be integrated into the design itself, not pasted on as stickers.',
  ];
  if (opts.hasLogo) {
    lines.push(
      '- Logo: place the supplied Gaonhae Taekwondo logo into the composition as a designed lock-up (masthead or header area), deliberately sized and spaced, sitting on a background that suits it. Never on a plain white sticker patch or a floating box.',
      '- The logo must appear ONCE, complete and unbroken: the full symbol together with the full "GAONHAE TAEKWONDO" wordmark, every character present and readable.',
      '- Never crop, mask, cut off, split, partially cover, fade or bleed the logo off the edge of the artwork, and never let illustration, text or shapes overlap it.',
      '- Keep its original aspect ratio and internal spacing — scale the whole logo uniformly only; no stretching, squashing, rotating, recolouring, re-lettering or redrawing.',
      '- Give the logo a clear margin of empty space on all sides and place it on a background with strong contrast so it reads as a proper lock-up.',
      '- Do not extract, reuse or repeat parts of the logo as decoration anywhere else in the artwork.',
      '- If space is tight, shrink the entire logo rather than trimming any part of it.',
    );
  }
  if (opts.hasQr) {
    lines.push(
      '- QR code: place the supplied QR code inside a designed holder that belongs to the artwork — a rounded panel, ribbon or framed card — with a short caption such as "Scan to register" beside or beneath it.',
      '- Reproduce the QR modules exactly as supplied: perfectly square, high contrast, not warped, not rotated, not tinted, never overlapped by illustration or text, with a clear quiet margin around it. A distorted QR code will not scan.',
    );
  }
  return lines.join('\n');
}

export function buildImagePrompt(
  format: AssetFormat,
  details: AssetDetails,
  opts: ImagePromptOptions = {},
): string {
  const blending = Boolean(opts.blendAssets && (opts.hasQr || opts.hasLogo));
  const composition =
    blending && format === 'poster' ? POSTER_COMPOSITION_BLENDED : FORMAT_COMPOSITION[format];
  const parts: string[] = [GAONHAE_BRAND_PROMPT, composition];

  if (details.branchName) parts.push(`Branch: ${details.branchName}.`);

  const lines = textLines(details);
  if (lines.length) {
    parts.push(
      [
        'Typeset the following text into the design exactly as written, spelled character for character, with no extra or invented words, using the house typography:',
        ...lines.map((l) => `- ${l}`),
        'Integrate all of this text into the composition itself — it must be part of the design, never parked in a leftover blank area or stacked as a plain paragraph block under the picture.',
        'Anchor the headline against a red or blue ribbon, banner, cloud motif or colour block; group the date, venue and price into a designed info band or panel; place the call to action inside its own shape.',
        'Use a strong typographic hierarchy: large bold headline, medium key details, small supporting details, with varied weight, size and colour (red and blue accents on white, or reversed white-on-colour where text sits on a coloured shape).',
        'Text and illustration may overlap and interlock, provided every word stays fully legible with strong contrast. No unstyled run-on body copy and no empty dead zones.',
        'All lettering must be crisp, correctly spelled and legible.',
      ].join('\n'),
    );
  }

  if (blending) {
    parts.push(blendBlock(opts));
  } else {
    parts.push('Leave a clean empty area in one bottom corner for a QR code and one top corner for a logo.');
  }

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
    'Keep the text integrated into the design — same ribbons, banners, panels and colour blocks holding the lettering; never fall back to a plain paragraph block in a blank area.',
    'Do not add, remove or move any illustration element.',
    'Leave any logo and QR code in the artwork completely untouched — same position, size and pixels.',
    'The Gaonhae Taekwondo logo must remain complete and unbroken: full symbol plus full wordmark, never cropped, masked, split, covered or resized.',
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
