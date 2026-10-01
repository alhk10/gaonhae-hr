# Make studio rental prices GST-inclusive

## What changes

- The advertised hourly rates and deposit already include GST. Using the screenshot example: 1.5h × $60 = **$90.00**, GST (9% incl.) **$7.43**, deposit **$200.00**, **Total to pay $290.00** — instead of adding $8.10 on top.
- Applies to all branches (Singapore 9% and Australia 10%), matching how Australian fees already work.
- The price breakdown on `/rental` shows the GST as "included" within the rental amount, not added on top.
- Invoices created when staff verify a rental follow the same inclusive split: rental line total stays as quoted, with the GST portion shown within it.

## Technical details

- Update `_studio_rental_quote` so GST is always extracted from the rental amount (`rental × rate / (1 + rate)`) and `total_amount = rental + deposit` regardless of country; set `gst_inclusive = true` for all countries.
- Update `_studio_rental_create_invoice` (used by `admin_review_studio_rental`) so invoice items and totals use the same inclusive split, keeping invoice total equal to the quoted total.
- The `/rental` breakdown already labels GST as "included" when `gst_inclusive` is set, so only a minor label check is needed on the frontend.
- Deposit is a refundable security deposit and stays GST-free.
- Existing pending/verified submissions are not recalculated.

## Verification

- Quote a Singapore booking (e.g. 1.5h × $60): total = $90 + $200 deposit = $290.00, GST shown as included.
- Verify a test rental and confirm the invoice total matches the quoted total.
