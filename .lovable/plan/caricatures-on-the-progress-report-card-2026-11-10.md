# Caricatures on the Progress Report Card

## Artwork
- Create 3 transparent cartoon caricatures in the style of the uploaded image (cheerful kid in white dobok, red/black collar, black belt):
  1. Thumbs-up kid (matching the reference) — beside the "Ready for Grading Test?" box.
  2. Kid doing a front kick — top right next to the title.
  3. Kid bowing — bottom left next to the footer motto.
- Saved as app images and embedded into the PDF.

## Layout reorganisation (A4 card page)
```text
[Logo]      PROGRESS REPORT CARD        [Kicking kid]
            TRAINING TODAY, LEADING TOMORROW!
[ Name / Belt / Age / Report Date box               ]
[ Physical Dev ]        [ Learning Skills ]
[ Taekwondo Skills ]    [ Character Dev ]
[ Ready for Grading Test? Yes / No ]  [Thumbs-up kid]
[Bowing kid]  RESPECT • DISCIPLINE • CONFIDENCE • PERSEVERANCE
```
- Section boxes shortened slightly so the grading box and caricatures fit with clear spacing; no text overlaps the images.
- Summary page unchanged (logo only).

## Technical details
- Generate PNGs to `src/assets/progress-card/` via image generation (transparent background).
- `progressCardPdf.ts`: preload all images as data URLs (same loader as the logo) and `addImage` at fixed positions; adjust box y-positions.
- Render a sample PDF and visually check before finishing.
