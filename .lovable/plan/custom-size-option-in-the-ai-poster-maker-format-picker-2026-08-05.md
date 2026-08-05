# Custom size option in the AI Poster Maker format picker

Add a fourth Format choice — **Custom size (cm)** — with width and height fields, so posters can be made at any print dimension instead of only A4 / 1:1 / 9:16.

## What changes

- Format dropdown gains **Custom size (cm)**.
- When selected, two number fields appear next to it: **Width (cm)** and **Height (cm)** (default 21 x 29.7, allowed range roughly 5-200 cm, one decimal).
- The generated artwork is produced at the closest supported aspect the image model offers (portrait, landscape or square, decided from the width/height ratio), and the prompt tells the AI the exact target print size and orientation in cm.
- Export (PNG / PDF) uses the exact cm values: the PDF page is created at that physical size and the artwork is fitted to it, so the downloaded file prints at the requested dimensions.
- Generation history stores and re-loads the custom dimensions along with the format, and the history label reads e.g. "Custom 30 x 40 cm".
- If width/height are missing or out of range, the Generate button is blocked with an inline hint.

## Technical detail

- `src/lib/ai/gaonhaeBrandPrompt.ts` — extend `AssetFormat` with `'custom'`, add its `FORMAT_LABELS` entry, and add a composition string built from the cm values (orientation-aware wording). `buildImagePrompt` / `buildCopyDetails` accept optional `widthCm` / `heightCm` and state the target print size in the prompt.
- `src/components/grading-list/AiDocumentTab.tsx` — `customW` / `customH` state, the two inputs shown only for `format === 'custom'`, validation, pass the values into the generate call and the export call, persist them in the history row payload and restore them on history click.
- `supabase/functions/ai-marketing-asset/index.ts` — accept `widthCm` / `heightCm`; for `format === 'custom'` map the ratio to the nearest allowed model size (`1024x1536`, `1024x1024`, `1536x1024`) instead of the fixed `SIZE_BY_FORMAT` lookup. Redeploy the function.
- `src/lib/ai/marketingExport.ts` — PDF export uses the cm page size (converted to points) for custom format; PNG export keeps the model's native pixels.

Note: image models only render a few fixed pixel sizes, so a custom ratio is approximated at generation time and made exact at export/print time.
