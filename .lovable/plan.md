## Change

Replace the single **Make a payment** button on `/hello` (after the student is matched) with four direct-action buttons that each jump straight into the products step for that category, skipping the intermediate "What would you like to pay for?" screen.

## File

`src/pages/public/PublicHelloChat.tsx`

## Buttons (in order)

| Label | Category (existing ID) |
| --- | --- |
| Pay Term Fees | `SCHOOL_FEES_CATEGORY_ID` |
| Register for grading | `GRADING_CATEGORY_ID` |
| Order Uniforms and Apparel | `UNIFORMS_CATEGORY_ID` |
| Order Protection Guards and Accessories | `117cdc13-1296-4651-bc4b-f0449873cbf1` |

## Implementation notes

- In the `stage === 'matched'` block (around lines 922–943), replace the `Make a payment` button with four buttons. Each `onClick` does:
  ```ts
  setPayCategory(<matching CATEGORIES entry>);
  setCart([]);
  goTo('payment_products');
  ```
- Keep the existing **Schedule / Reschedule a lesson** button unchanged below them.
- Use the primary button style for the first (Pay Term Fees), `variant="outline"` for the other three, matching the current visual hierarchy. Height/spacing stays `h-11` inside the same `Card` / `CardContent` wrapper.
- No changes to `CATEGORIES` labels, the `payment_category` stage code, routing, or any backend logic — `payment_category` remains reachable via back navigation but is no longer the default landing.

## Verification

Load `/hello`, identify a student, and confirm:
- Four new buttons appear with the exact labels above.
- Each button jumps straight to the correct product list (Term Fees / Grading / Uniforms / Guards).
- Schedule / Reschedule a lesson still works.
