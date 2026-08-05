# Website QR code for www.gaonhaetaekwondo.com

Create a scannable QR code pointing to `https://www.gaonhaetaekwondo.com`, deliver it as a downloadable PNG, and add it as a selectable option in the AI Poster Maker.

## What changes

- A new high-resolution QR PNG (black on white, generous quiet margin, error correction level H so it survives printing and blending into artwork).
- The AI Poster Maker QR dropdown gains a fourth choice: **Website** — alongside No QR, Seminars, Competitions, Payment. It behaves exactly like the existing QR options: previewed in the picker, sent to the AI for blending, or composited onto the exported PNG/PDF.
- A standalone copy of the PNG is delivered for download so it can be used on printed flyers, posters and signage outside the app.

## Technical detail

- Generate the QR offline (Python `qrcode`) at ~1200x1200 px, ECC level H, 4-module quiet zone; save to `src/assets/qr/gaonhae-website-qr.png` and a copy to `/mnt/documents/`.
- `src/lib/ai/marketingExport.ts` — import the new PNG, extend `QrChoice` with `'website'`, add `{ value: 'website', label: 'Website', src: websiteQr }` to `QR_OPTIONS`. `qrSrc()`, `composeArtwork()` and the picker in `AiDocumentTab.tsx` all read from `QR_OPTIONS`, so no further wiring is needed.
- Verify the rendered QR decodes back to the exact URL before delivering.

No database, edge function or prompt changes.
