# Hello chat: simplify Foundation grading + add SG GST

## 1. Remove Foundation level checkboxes

In `src/pages/public/PublicHelloChat.tsx` (Hello chat grading flow):

- Delete the "Grading level(s)" Checkbox block (currently lines ~1150-1183).
- Keep auto-selection of the student's current belt transition (already done via the existing `useEffect` that seeds `selectedFoundationLevels` with `matched.current_belt`). So if current belt is "Foundation 1", `Foundation 1 >> Foundation 2` is auto-selected.
- In the product preview list (the `(FOUNDATION_LEVELS).map(level => ...)` cards), render **only the auto-selected level's product card** instead of all three transitions. This avoids confusion now that there's no way to pick more.

Result: user lands on the screen with the single relevant transition already selected and visible, then picks slot → Continue.

## 2. Add 9% GST for Singapore branches on the chat payment screen

Mirror the logic in `/pay` (`PublicGradingPayment.tsx`):

```ts
const GST_RATE = 0.09;
const isSingapore = branch?.country?.toLowerCase() === 'singapore';
const gstAmount = isSingapore ? cartTotal * GST_RATE : 0;
const totalAmount = cartTotal + gstAmount;
```

On the `payment_pay` stage in `PublicHelloChat.tsx`:

- Replace the single "Amount to pay" row with a breakdown when SG:
  - Subtotal: `$cartTotal`
  - GST (9%): `$gstAmount`
  - Total: `$totalAmount` (bold)
- Non-SG: keep current single "Amount to pay" row.

Submit `amount: totalAmount` (not `cartTotal`) in `handleSubmitPayment` so the invoice/payment record matches what the user paid.

## Out of scope

- No changes to the `/pay` page or to `match_student_by_identity`.
- No backend tax line items / invoice schema changes — only the amount sent changes.
- Non-grading flows (no Foundation logic involved) are unaffected.
