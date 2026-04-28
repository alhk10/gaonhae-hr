## Goal

Adjust the certificate footer in `src/utils/gradingCertificatePDFGenerator.ts`:

- Move the affiliation logos (World Taekwondo + Kukkiwon) **0.5cm (5mm) to the right**
- Move the master signature **0.5cm (5mm) to the left**
- Increase the **size of both logos and the signature by 10%**

## Changes (lines 161–177)

**Logos — shift right + 10% larger box**
- WT box: `fitBox(..., 32, 24)` → `fitBox(..., 35.2, 26.4)`; `wtX: 22 → 27`
- KW box: `fitBox(..., 36, 24)` → `fitBox(..., 39.6, 26.4)`; `kwX: 60 → 65` (kept proportional gap; vertical-centring strip stays 24mm so layout doesn't push into other elements)

**Signature — shift left + 10% larger box**
- Sig box: `fitBox(..., 50, 28)` → `fitBox(..., 55, 30.8)`
- `sigRightEdge: A4_W - 30 → A4_W - 35` (right edge moves 5mm left, signature follows)

The "In Affiliation With" label position remains unchanged (still anchored above the logos region).

## Files

- `src/utils/gradingCertificatePDFGenerator.ts` (footer block only)

Approve to apply.