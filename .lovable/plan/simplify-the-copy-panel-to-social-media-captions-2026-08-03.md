# Simplify the copy panel to Social Media Captions

The right-hand "Copy" card in the AI Document tab of `/access` currently shows four text fields (Headline, Subheadline, Body, Instagram caption) plus hashtags. Only the caption and hashtags are useful for posting.

## What changes

- Rename the card title from **Copy** to **Social Media Captions**.
- Remove the Headline, Subheadline and Body editors from the panel.
- Keep the caption editor (relabelled **Caption**) and the hashtags field.
- Keep the existing buttons: Copy caption, Regenerate copy.

## Technical detail

- `src/components/grading-list/AiDocumentTab.tsx` — drop the three field blocks in the copy card (lines around 750-762), rename the `CardTitle`, relabel "Instagram caption" to "Caption".
- The underlying `GeneratedCopy` type and edge function keep returning headline/subheadline/body; those values are still stored in generation history and still feed the artwork text, they are simply no longer shown or edited here. No backend or prompt changes.
