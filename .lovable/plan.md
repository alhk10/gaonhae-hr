# Fix "No grading slots" when a slot does exist

## What's actually happening

YUZHOU HE is a Yellow Tip student at Morley. The Morley grading event created today for 19/09/2026 covers these belts only:

Foundation, Foundation 1-3, Green Tip, Green, Blue Tip, Blue, Red Tip, Red, Black Tip, 1st/2nd/3rd Poom, 1st/2nd/3rd Dan.

White, Yellow Tip and Yellow are missing, because the event's grading fee list left out "White >> Yellow Tip", "Yellow Tip >> Yellow" and "Yellow >> Green Tip" (belt levels on an event are derived from the fees ticked on it).

So the invoice screen correctly finds no slot for this student — but it reports "No grading slots", which reads as if none exist at all, and the Create Invoice button stays blocked with no way forward.

## Changes

1. **Correct the Morley 19/09/2026 event data** — add the three missing white/yellow grading fees so the event covers White, Yellow Tip and Yellow. After this, YUZHOU HE's slot appears normally.

2. **Say why, not just "none"** — when slots exist at the branch but none match, the invoice row shows e.g. "No slot for Yellow Tip on 19/09/2026" instead of the generic message. The plain "create one in Sales -> Grading" text stays only when the branch truly has no upcoming event.

3. **Allow an override** — a small "Show all slots" link next to that message lists every active slot at the branch regardless of belt/age, so staff can still raise the invoice while the event is being corrected. A picked out-of-criteria slot is flagged in amber on the row, consistent with how out-of-criteria products are already marked.

## Technical detail

- `src/components/sales/InvoiceDialog.tsx`: `getFilteredGradingSlots()` gains a bypass flag; the Term/Slot cell renders the reason text plus the "Show all slots" toggle, and `addItem` is no longer blocked when the override is on. No change to how the chosen slot is saved.
- Data fix via migration on `grading_slots` row `5aba7f24-...` (Morley, 2026-09-19): append the three white/yellow product IDs to `grading_product_ids` and the belts White, Yellow Tip, Yellow to `belt_levels`. No schema change.
