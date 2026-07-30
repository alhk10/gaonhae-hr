## Goal

On the public `/fees` page, class prices from Products & Services are weekly rates. Charge the full term instead: weekly price × number of weeks in the selected term (typically 12).

## Changes (frontend only, `src/pages/public/PublicSchoolFeesPayment.tsx`)

1. **Week count helper** — derive weeks from the selected term's `start_date`/`end_date`:
   `weeks = Math.max(1, Math.round((end - start + 1 day) / 7 days))`. Fall back to 12 when no term is selected.

2. **Line-item pricing** — `subtotal = branch_price × weeks`. GST logic unchanged (9% for Singapore branches, applied to the subtotal as today), so GST and Total automatically reflect the term amount.

3. **Class dropdown labels** — show the weekly rate plus the term total, e.g.
   `Black Tip & Above 1x Weekend — $50.00/wk × 12 = $600.00`.

4. **Summary box** — the line row shows `Class name — Term name (12 weeks)` with the term amount; GST and Total rows unchanged.

5. **Submit button** already uses `totalAmount`, so it will show the term total; the submitted `amount` sent to `submit_public_school_fees` becomes the term total.

## Notes

- No database or product-price changes; product records stay as weekly rates.
- Term length comes from the term calendar, so terms shorter/longer than 12 weeks price correctly.
