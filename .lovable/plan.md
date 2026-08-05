# Show and edit the AI prompts

Right now the AI Poster Maker builds both prompts behind the scenes: the artwork prompt (house style + composition + your typed text + QR/logo rules) and the caption prompt (your details sent to the copy model). Neither is visible or editable.

## What changes

A collapsible **Prompt** section in the AI Poster Maker, under the form, with two tabs:

- **Artwork prompt** — the exact text that will be sent to the image model, shown in a large textarea, live-updating as you change the form fields, format, QR/logo and blend toggle.
- **Caption prompt** — the details block sent to the caption model, also editable.

Each has:
- An **Edit** toggle. While off, the box mirrors the form. Turn it on and the text becomes yours — form changes no longer overwrite it (a small "manually edited" badge shows this).
- **Reset to auto** — discards your edits and goes back to the generated prompt.
- **Copy** — copies the prompt to clipboard.

Generate Artwork / Update Text / Generate Captions all send the edited prompt when the edit toggle is on, and the auto-built one otherwise. When "Update Text" is used, the box shows the text-edit prompt variant instead.

Each history entry stores the prompt actually used, so reloading an old generation restores that exact prompt into the box.

## Technical detail

- `src/components/grading-list/AiDocumentTab.tsx`
  - New state: `promptOverride: string | null`, `copyPromptOverride: string | null`, `promptTab`, `promptOpen`.
  - Derive `autoImagePrompt` via `useMemo` calling `buildImagePrompt(format, details, { blendAssets, hasQr, hasLogo, customSize })` (and `buildTextEditPrompt(details)` for the text-only variant), plus `autoCopyPrompt` from `buildCopyDetails(...)` rendered as `key: value` lines.
  - In `runGeneration`, use `promptOverride ?? built prompt`. In `runCopyGeneration`, when `copyPromptOverride` is set, pass `{ _prompt: override }`-style raw text through to the service.
  - Save `prompt` (and `copyPrompt`) into the `inputs` jsonb on `saveAsset`; restore into the overrides when a history row is clicked.
- `src/services/aiMarketingAssetService.ts` — `generateCopy` gains an optional `promptOverride` string passed in the request body.
- `supabase/functions/ai-marketing-asset/index.ts` — copy mode accepts an optional `promptOverride`; when present it replaces the generated facts block in the user message (system message and JSON response contract stay unchanged so parsing still works).
- Brand assets still need to be attached before the prompt is finalised, so the artwork prompt preview assumes the current QR/logo/blend selection; sending falls back to the auto prompt if blending resolves differently only when no override is set.
