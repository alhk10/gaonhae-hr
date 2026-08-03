# Show the full Gaonhae Taekwondo logo

In the sample poster the logo appears clipped — only part of the mark and wordmark survive the blend. The model is currently told to reproduce the logo exactly, but nothing forbids cropping, masking or splitting it, so it treats the logo as an element it can trim to fit.

## What changes

The blend instructions for the logo get stricter, whole-mark wording:

- The logo must appear **once, complete and unbroken** — full symbol plus full "GAONHAE TAEKWONDO" wordmark, all characters present and readable.
- Never crop, mask, cut off, split, partially cover, fade or bleed the logo off the edge; nothing may overlap it.
- Keep its original aspect ratio and internal spacing — scale uniformly only, no stretching, squashing, rotating, recolouring, re-lettering or redrawing.
- Give it a clear margin of empty space on all sides so it reads as a proper lock-up, and place it on a background that gives strong contrast.
- Do not extract, reuse or repeat parts of the logo as decoration elsewhere in the artwork.
- If space is tight, shrink the whole logo rather than trimming any part of it.

The same "logo stays complete and untouched" rule is reinforced in the text-only edit prompt so regenerations can't clip it either.

## Technical detail

- `src/lib/ai/gaonhaeBrandPrompt.ts` — expand the logo bullets in `blendBlock()` with the rules above; strengthen the existing logo line in `buildTextEditPrompt`.
- `supabase/functions/ai-marketing-asset/index.ts` — update the per-asset label text for `kind === 'logo'` to carry the same whole-logo instruction, then redeploy the function.

No UI, service or database changes.
