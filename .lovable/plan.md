Add a GST breakdown line under the amount to pay in the `/hello` public chat payment stage.

### Scope
- File: `src/pages/public/PublicHelloChat.tsx` around the `payment_pay` stage (lines ~1307-1355).
- No backend changes; this is a display-only update.

### Current behavior
- Singapore branches: show Subtotal + GST (9%) + Total.
- Non-Singapore branches: show only "Amount to pay".

### New behavior
For every branch, show the GST component directly under the "Amount to pay" line:
- **Singapore**: `GST (9%)` — calculated on top of the cart subtotal, matching the existing breakdown.
- **Australia**: `GST included amount (10%)` — calculated as the GST portion already embedded in the displayed amount to pay (e.g., $380.00 × 10/110 = $34.55).
- **Other branches**: no GST line if the branch has no configured GST rule.

### Implementation details
1. Introduce a per-branch GST configuration in the component:
   - `GST_RATE`: 0.09 for Singapore, 0.10 for Australia.
   - `gstIsIncluded`: true for Australia, false for Singapore.
2. Compute the display values:
   - For included-GST branches: `gstAmount = cartTotal * (rate / (1 + rate))`.
   - For added-GST branches: keep existing `gstAmount = cartTotal * rate` and `totalWithTax = cartTotal + gstAmount`.
3. Update the JSX in `payment_pay`:
   - Always render the "Amount to pay" line.
   - Immediately below it, render the GST line for Singapore and Australia.
   - For Singapore, keep the existing full breakdown (Subtotal / GST / Total) as is, or collapse it into the same unified format.
4. Verify the label reads "GST included amount" for Australian branches and the calculation matches the user's expectation.

### Out of scope
- No changes to payment submission logic or invoice totals.
- No changes to other payment pages (grading, seminar, guards, competition, staff invoice dialogs).