# Limited Edition popup: full-width image, GST-inclusive price

1. Each product image fills the popup's full width (height follows the image, no cropping). Several images scroll sideways, each one full width.
2. The price shows the amount with GST included in Singapore (e.g. S$27.52 becomes S$30.00), with no "+ GST" text. Australia stays the same.
3. The order screen's line prices also show GST-inclusive amounts. The total stays the same, and the GST 9% line is still shown as "incl." info.

## Technical
- `LimitedEditionPopup.tsx`: image class `w-full h-auto shrink-0 snap-center`, container `snap-x`.
- Display price `isSG ? taxRound(price*1.09)` style; summary keeps subtotal/GST math unchanged so charged total is identical.
