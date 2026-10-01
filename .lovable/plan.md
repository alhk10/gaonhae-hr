# Public studio rental form with agreement and signature

## Experience
- New public page at `/rental` (no login). The renter picks a branch, then enters name, NRIC/UEN, contact number and email.
- Booking: the renter adds one or more sessions (date, start and end time in 30-minute steps, minimum 1 hour). The form shows the hours and price as they go.
- Pricing comes from each branch's rental settings: standard hourly rate up to the monthly threshold, then the lower rate applies to all hours that month (default $60, $45 after 10 hours). Hours already booked that month by the same renter count toward the threshold.
- $200 deposit (set per branch) is added automatically on the renter's first booking, matched by NRIC/UEN or email.
- The full Studio Rental Agreement is shown with the chosen branch name and that branch's rates and deposit filled in. The renter ticks "I have read and agree" and signs in a signature box.
- Payment uses the existing branch payment details (PayNow / bank transfer, Australian details for Australian branches) with an image-only proof upload. GST follows the branch country rules.
- After submitting, the renter sees a confirmation that the booking is pending staff confirmation and payment check.

## Staff side (/access)
- New "Studio Rental" tab, in the same standard list layout as the other tabs: renter, branch, sessions, amount, deposit, proof, signed agreement, status, and verify / reject / delete-request actions. Branch passwords see only their branch.
- Rental settings per branch: on/off, hourly rate, discounted rate, monthly hour threshold, deposit amount.
- Clicking a row opens the signed agreement (exact text agreed, signature, date) with a PDF download.
- Verified rentals create a paid & verified invoice for the branch (rental lines plus deposit line), using the branch country's invoice template.

## Technical details
- New tables: `studio_rental_settings` (per branch) and `studio_rental_submissions` (renter details, sessions as JSON, pricing breakdown, deposit flag, agreement text snapshot, signature PNG, proof URL, status, client_ref unique for idempotent retries). GRANTs + RLS; anonymous access only through SECURITY DEFINER RPCs (submit, quote, staff list/verify/reject), never direct table writes.
- Server-side recalculation of price, threshold and deposit eligibility on submit so the browser total cannot be tampered with.
- Signature and proof stored in private storage; previews via short-lived signed links.
- Reuse `SignaturePad`, proof validation, GST helpers, date selectors (DD/MM/YYYY) and the existing `/access` list styles.

## Verification
- Submit test bookings for a Singapore and an Australian branch: under and over the threshold, first booking (deposit added) and repeat booking (no deposit), missing signature or agreement tick blocked.
- Confirm the staff tab, branch filtering, verify-to-invoice, and agreement PDF.
