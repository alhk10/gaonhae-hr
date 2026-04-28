## Problem

On the grading certificate footer, the World Taekwondo logo, Kukkiwon logo, and Master Alvin Lee signature are drawn into fixed-size boxes (36×24mm for logos, 50×28mm for signature) that don't match the source image proportions. The signature is the worst offender — its source is roughly square (456×466) but it's stretched into 50×28, making it look unnaturally wide.

## Source image aspect ratios

- World Taekwondo: 484×231 → ratio ~2.10 (wide)
- Kukkiwon: 347×244 → ratio ~1.42
- Master signature: 456×466 → ratio ~0.98 (nearly square)

## Fix

In `src/utils/gradingCertificatePDFGenerator.ts` (footer block around lines 137–152), constrain each image to a max width AND max height box, then compute the actual draw size from its true aspect ratio so it fits inside the box without stretching. Keep the existing left/right anchor positions and vertically align logos along the same baseline.

Target bounding boxes (chosen to keep the current footprint):
- WT logo: max 32w × 24h → renders ~32×15.3
- Kukkiwon logo: max 36w × 24h → renders ~34×24
- Signature: max 50w × 28h → renders ~27.4×28 (no longer stretched)

Anchor positions stay roughly the same; the signature is right-aligned to its existing right edge so the layout shifts inward rather than overlapping other elements.

No other files change. Bulk and single certificate flows both use this generator, so both are covered.

**Approve to switch to default mode and apply the fix.**