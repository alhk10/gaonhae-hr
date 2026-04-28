## Certificate Footer Repositioning

Edit `src/utils/gradingCertificatePDFGenerator.ts`:

**Move logos left by 1cm (10mm):**
- WT logo: `wtX` `32` → `22`
- Kukkiwon logo: `kwX` `70` → `60`

**Move all footer elements (logos, text, signature) up by 3cm (30mm):**
- `footerY` `230` → `200`
- Signature `sigY` adjusted to also move up 30mm with the new footerY.

**Centre "In Affiliation With" text between the 2 logos:**
- Compute centre X = midpoint between left edge of WT logo (`wtX = 22`) and right edge of Kukkiwon logo (`kwX + kwBox.w`).
- Render text with `{ align: 'center' }` at that midpoint, replacing the current left-anchored `x = 30`.

Sizes and signature horizontal position unchanged.