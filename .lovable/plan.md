# AI Document tab: logo choice, model choice, text in artwork, reference images

Four changes to the **AI Document** tab in `/access`.

## 1. Logo selection

A new "Logo" row of thumbnails next to the QR selector:
- No logo
- Current mark (`src/assets/gaonhae-logo.png`)
- New calligraphy logo (the uploaded `Logo_White_BG2.jpg`, added as a project asset)

The chosen logo is composited onto the exported PNG/PDF (top-left, white pad) exactly as today — it is never drawn by the AI model, so it stays pixel-accurate. The choice is saved with the generation and restored from history.

## 2. Choose the AI generator

A "Model" dropdown above the Generate buttons, defaulting to the current one:
- OpenAI GPT Image 2 (default, best text rendering)
- OpenAI GPT Image 1 Mini (cheaper/faster)
- Gemini 3.1 Flash Image / Nano Banana 2
- Gemini 3 Pro Image (highest quality)

The edge function builds the correct request body per model family (OpenAI `prompt` + `quality` + `partial_images`; Gemini `messages` + `modalities`), so switching models keeps streaming previews working. The selected model is stored with the generation.

## 3. Text rendered inside the artwork, and text-only regeneration

Today the prompt asks the model to leave text areas blank. That changes: the headline, date & time, venue, pricing and call to action are now passed as literal strings the model must typeset into the layout, with an explicit instruction to spell them exactly and use the house typography.

When any of those detail fields is edited after an image already exists, the **Generate artwork** button becomes **Update text**: instead of a fresh generation, the existing image is sent back to the model as an edit with an instruction to change only the lettering to the new values and keep the illustration, layout, colours and composition identical. A "New artwork" button stays available for a full regeneration.

Text-editing runs on an image-editing capable model (the Gemini image models); if the currently selected model is OpenAI-only, the tab tells you it will use the Gemini editor for the text update.

## Technical detail

- `src/lib/ai/gaonhaeBrandPrompt.ts` — replace the "leave text areas blank" clause with a typesetting block listing each supplied field verbatim; add `buildTextEditPrompt(details)` for the change-text-only instruction.
- `src/lib/ai/marketingExport.ts` — add `LOGO_OPTIONS` / `LogoChoice` and make `composeArtwork(image, qrChoice, logoChoice)` honour the selection.
- `src/assets/logo/` — add the uploaded calligraphy logo.
- `supabase/functions/ai-marketing-asset/index.ts` — accept `model` and optional `baseImage` (base64) on `mode: "image"`; branch the request body by model family; when `baseImage` is present send it as an image part alongside the edit prompt. Keep SSE passthrough and verbatim 429/402/content-policy errors.
- `src/services/aiMarketingAssetService.ts` — `generateImage(password, format, prompt, model, baseImage?, onFrame)`.
- `src/components/grading-list/AiDocumentTab.tsx` — logo picker, model dropdown, dirty-field tracking to toggle Update text vs New artwork, and pass `logo_choice`/`model` through to `saveAsset` + history restore.
- Migration: add nullable `logo_choice text` and `model text` columns to `ai_marketing_assets`.
