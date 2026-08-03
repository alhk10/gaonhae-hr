# Blend the QR code and logo into the generated artwork

Today the AI is told to "leave a clean empty area" for the QR and logo, and both are pasted on afterwards on white pads during export. The result looks stuck on rather than designed in.

## What changes

**1. The AI receives the actual QR and logo images**

When a QR code and/or logo is selected, those exact image files are sent to the image model along with the prompt, labelled as brand assets (not style references). The model composes them into the layout itself: the QR sitting inside a designed panel, ribbon or card that belongs to the poster, and the logo integrated as a proper lock-up in the masthead area with matching colour treatment and spacing.

**2. New prompt language**

Replace "leave a clean empty area in one bottom corner for a QR code and one top corner for a logo" with integration instructions:
- Place the supplied logo into the design as part of the composition (masthead / lock-up), sized and spaced deliberately, on background that suits it — never on a plain white sticker patch.
- Place the supplied QR code inside a designed holder (rounded panel, ribbon, or framed card) with a short caption such as "Scan to register", visually part of the artwork.
- Reproduce the QR modules exactly, square, high contrast, unwarped, unrotated, never overlapped by illustration or text, with a quiet margin — a distorted QR does not scan.
- Reproduce the logo exactly as supplied: do not redraw, restyle, recolour or re-letter it.

**3. Blend vs overlay control**

A small toggle above the Generate buttons: **Blend into design (AI)** — default on when a QR or logo is chosen — or **Overlay on export** (today's behaviour).

- Blend on: the assets go to the model, and the export step skips the paste-over so they are not drawn twice.
- Blend off: unchanged from today, and the prompt keeps reserving corner space.

Because the model needs image input, blended generation runs on the Gemini image models. If an OpenAI model is selected in the Model dropdown, the tab shows the same note it already shows for reference images, saying the Gemini image model will be used for this generation.

**4. Scan check**

After a blended generation, the preview shows a reminder to scan-test the QR before printing, plus a one-click **Overlay QR instead** action that re-composes the finished artwork with the pixel-exact QR pasted on top, in case the model's rendering does not scan.

## Technical detail

- `src/lib/ai/gaonhaeBrandPrompt.ts` — `buildImagePrompt(format, details, opts?)` gains a `blendAssets` option; when true it emits the integration block above instead of the reserve-space line, and `FORMAT_COMPOSITION.poster` drops "clear empty square … reserved for a QR code". `buildTextEditPrompt` gains a line telling the model not to touch the logo or QR.
- `src/lib/ai/marketingExport.ts` — `composeArtwork(image, qrChoice, logoChoice, opts?)` gains `{ skipQr, skipLogo }` so blended exports don't double-stamp; add a helper that fetches a bundled asset URL and returns a base64 data URL for sending to the model.
- `src/components/grading-list/AiDocumentTab.tsx` — `blendAssets` state (defaults true once a QR or logo is picked), toggle UI, convert the selected QR/logo to data URLs and pass them in a new `brandAssets` field, pass `blendAssets` into `buildImagePrompt`, skip the corresponding overlay on export, add the scan reminder and the "Overlay QR instead" action, and persist `blendAssets` in the saved `inputs` so history restores it.
- `src/services/aiMarketingAssetService.ts` — `ImageGenOptions` gains `brandAssets?: { kind: 'qr' | 'logo'; dataUrl: string }[]`, forwarded in the request body.
- `supabase/functions/ai-marketing-asset/index.ts` — accept `brandAssets` (max 2); they count as image input, so the same Gemini fallback that applies to references applies here. Push each as a labelled text part plus an `image_url` part, worded as "this is the exact QR code / logo to integrate — reproduce it exactly, do not redraw it", kept distinct from the style-reference parts.
