## Investigation

I checked `src/utils/gradingCertificatePDFGenerator.ts` (the only certificate generator in the project). The previously approved adjustments **are present in the code**:

- `wtX = 27` (was 22) — WT logo +5mm right
- `kwX = 65` (was 60) — Kukkiwon logo +5mm right
- WT fitBox `35.2 × 26.4` (was 32 × 24) — +10% larger
- KW fitBox `39.6 × 26.4` (was 36 × 24) — +10% larger
- `sigRightEdge = A4_W - 35` (was A4_W - 30) — signature 5mm left
- Sig fitBox `55 × 30.8` (was 50 × 28) — +10% larger

So the source already reflects the intended changes. Two likely reasons the uploaded screenshot looks the same:

1. **Cached PDF** — the screenshot may be a previously generated/downloaded file, not a freshly regenerated one. The PDF needs to be re-generated after the deploy.
2. **The shift is too subtle to notice** — 5mm on an A4 page is small, especially next to the "In Affiliation With" label which sits at x=30. The WT logo (wtX=27) still starts just left of the label, so visually nothing dramatic changed.

## Proposed action

To make the change clearly visible and match the user's intent, I propose **doubling the shift to 10mm (1cm)** while keeping the +10% size increase already applied:

- `wtX: 27 → 32`
- `kwX: 65 → 70`
- `sigRightEdge: A4_W - 35 → A4_W - 40`

This will make the logos sit clearly to the right of the "In Affiliation With" label and the signature noticeably further from the right edge. No other code changes needed.

## Files

- `src/utils/gradingCertificatePDFGenerator.ts` (footer block, lines 160–178)

Approve to apply, or tell me a different shift amount.
