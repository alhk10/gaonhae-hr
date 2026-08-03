# Rename AI Document tab and auto-generate captions

## What changes

1. **Rename the tab** — "AI Document" becomes "AI Poster Maker" in the `/access` tab bar, plus any heading/label text inside the panel that still says "AI Document".

2. **Captions generate automatically** — pressing "Generate artwork" now also produces the social media captions in the same action, so no separate caption click is needed.
   - Caption generation runs in parallel with the artwork stream, so the poster preview still appears as fast as it does today.
   - Captions only auto-generate on a full artwork generation, not on the text-only "Update text" path (that keeps the existing captions).
   - The manual "Generate captions" button stays, for regenerating captions on their own.
   - If caption generation fails, the artwork still completes; a small error toast explains the caption part failed.
   - The captions saved into generation history are the freshly generated ones.

## Technical notes

- `src/pages/public/PublicGradingList.tsx`: change the `TabsTrigger value="ai-document"` label text.
- `src/components/grading-list/AiDocumentTab.tsx`:
  - update any in-panel title text.
  - extract the caption call from `handleGenerateCopy` into a reusable helper returning the generated copy.
  - in `runGeneration(false)`, kick off the caption helper alongside `generateImage`, await it before `saveAsset` so the stored `copy` field holds the new captions.
