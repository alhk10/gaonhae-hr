# Hide package-card pricing on /hello school-fees step

On the `/hello` school-fees step, each selectable package card currently shows the package name followed by a second line such as `$36.25 / week`. Hide that price line only; keep all other pricing (expanded 4-week / full-term plan totals, cart summary, payment summary) exactly as it is.

## What changes

1. **Remove the per-package price line**
   - In `src/pages/public/PublicHelloChat.tsx`, find the school-fees package list rendering the package card.
   - Remove the `<p className="text-xs text-muted-foreground">` element that displays `${getDisplayPrice(product, branchCountry).toFixed(2)}{showTerms ? ' / week' : ''}`.
   - Keep the package name, badges (`Size required`, `Preorder`, `All terms paid`), and the rest of the card layout intact.

2. **Preserve spacing and click target**
   - The remaining package name row should keep its existing flex layout and tap target so the card is still selectable.
   - No replacement text is added; the price line simply leaves empty space.

3. **Leave other prices untouched**
   - The expanded `4 weeks` / `Full term` selector still shows weekly maths and totals.
   - The cart/payment summary and invoice totals remain visible.

## Files to edit

- `src/pages/public/PublicHelloChat.tsx` (school-fees package list UI only)

## Verification

- Type-check and build pass.
- Preview `/hello` school-fees step: package cards show only name and badges, no `$X / week` line.
- Expanded plan selector and payment summary still display prices correctly.
