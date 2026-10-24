# Hide cancelled/refunded class fees from School Fees list

Goal: rows like Alexander Malinovski INV-202610-0124 (cancelled and refunded) no longer appear in `/access` School Fees.

## Change
- Update the School Fees list function so it skips any row where the invoice is cancelled, void or refunded, or the submission status is cancelled/refunded.
- Applies to /hello, Auto and Manual rows alike. The paid INV-202610-0101 row stays.
- No data is deleted; the cancelled invoice and its credit stay in the student's history.

## Technical
- New migration recreating `get_public_school_fees_list` with an extra filter: `i.status NOT IN ('cancelled','void','refunded')` and `x.status NOT IN ('cancelled','refunded')`.
- Verify with a query that INV-202610-0124 is gone and INV-202610-0101 remains.
