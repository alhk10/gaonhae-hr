# Reactivate grading on /hello

"Register for grading" is currently shown greyed out with a "Coming soon" badge, even though the full grading journey behind it is already built and working (belt-based grading fee, grading slot picker, payment, invoice and proof upload).

## What changes

- "Register for grading" becomes an active button on the recognised-student menu.
- Tapping it opens the existing grading step: the correct grading fee for the student's next belt, a grading slot picker for their branch, then payment and screenshot upload as with term fees.
- "Schedule / Reschedule a lesson", "Order Uniforms and Apparel" and "Order Protection Guards and Accessories" stay as "Coming soon".

## Existing rules kept as-is

- Grading fee is chosen from the student's current belt; Singapore Foundation levels keep their multi-level selection.
- Only grading slots the student is eligible for (age, belt, branch availability) are offered.
- Continue stays disabled until a grading item and a slot are chosen.
- Payment, GST, credit use, proof-screenshot checking and staff verification behave exactly as for term fees.

## Technical detail

In `src/pages/public/PublicHelloChat.tsx`, the matched-student menu renders grading, uniforms and protection through one disabled `.map()` block. Move the grading entry out of that block into its own enabled button that mirrors the Pay Term Fees handler (`setPayCategory(cat); setCart([]); goTo('payment_products')`), leaving the remaining two entries disabled with their badges. No backend or database changes.
