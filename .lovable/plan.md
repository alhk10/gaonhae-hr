# Incorporate all text into the design

Right now the artwork comes back as an illustration on top with the headline, date, venue, price and details stacked as a plain left-aligned paragraph block in the empty lower third — it reads like a caption pasted under a picture rather than a designed poster.

## What changes

The prompt stops reserving a blank lower third and instead tells the model to treat the text as part of the composition:

- Every supplied field must be typeset **inside** the layout, integrated with the illustration and graphic shapes — not parked in a leftover white area.
- Text sits on, around and between the design elements: headline anchored against a red/blue ribbon, banner, cloud motif or colour block; date, venue and price grouped in a designed info band or panel; the call to action inside its own shape next to the QR holder.
- Clear typographic hierarchy — big bold headline, medium key details, small supporting details — with varied weight, size and colour (red/blue accents on white, or reversed white-on-colour where it sits on a coloured shape).
- No unstyled body-copy paragraphs, no plain left-aligned run-on text, no empty dead zones.
- Illustration and text may overlap and interlock as long as every word stays fully legible with adequate contrast.
- Text must still be spelled exactly as supplied, character for character.

The per-format composition lines are updated to match: the poster no longer asks for "generous clean white space in the lower third", the square and reel lines no longer push all text into the lower area — each instead describes text woven through the whole frame within safe margins.

The same integration rule is added to the "update text only" edit prompt, so text-only regenerations keep the integrated treatment instead of falling back to a plain block.

## Technical detail

- `src/lib/ai/gaonhaeBrandPrompt.ts`
  - Rewrite `FORMAT_COMPOSITION` (all three formats) and `POSTER_COMPOSITION_BLENDED` to describe full-frame text integration instead of a reserved text area.
  - Extend the typesetting block in `buildImagePrompt` with the integration rules above (hierarchy, ribbons/panels/colour blocks, no plain paragraph block, legibility over overlap).
  - Add a matching "keep the text integrated into the design" line to `buildTextEditPrompt`.

No UI, service, edge-function or database changes.
