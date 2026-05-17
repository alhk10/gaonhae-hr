# Public Grading Payment — Enhancements

## 1. Multi-select Foundation gradings

When the selected **Current Belt** is `Foundation 1`, `Foundation 2`, or `Foundation 3`, replace the single resolved product with a **checkbox group** offering all three Foundation transition products:

- Foundation 1 >> Foundation 2
- Foundation 2 >> Foundation 3
- Foundation 3 >> White

The user can tick one or more. Each ticked row shows its branch-resolved price; a **Total** line sums the selected prices.

For all non-Foundation current belts, the page keeps its current behavior (single auto-resolved product).

On submit, one `grading_payment_submissions` row is inserted per selected product, sharing the same proof upload, branch, DOB, student name, and payment method. Reference numbers are generated independently per row (existing trigger).

## 2. Payment method dropdown

Add a **Payment Method** select above proof upload:
- `PayNow` (default for SG branches) — renders existing PayNow QR via `PaymentInfoDisplay`.
- `Bank Transfer` — renders bank transfer details from `invoice_templates.bank_transfer_info` (already returned by the RPC but currently unused).

Chosen method is stored on each inserted row's `payment_method`.

## 3. Branch pricing (price_rules)

Replace the single-product lookup with a new RPC `get_public_grading_products(p_branch_id, p_current_belts text[])` that returns one row per matching grading product with:

- `product_id`, `product_name`, `base_price`
- `branch_price` — resolved via the latest active `price_rules` row for that `branch_id` with a non-null `price_override`, falling back to `base_price`

The frontend sums `branch_price` across selected products for the displayed total and per-row `amount`. Existing `get_public_payment_options` is kept for QR/bank info + slot lookup (or merged — implementation detail).

## Files

- **Migration**: add `get_public_grading_products` RPC (SECURITY DEFINER, read-only).
- **`src/services/gradingPaymentSubmissionService.ts`**: add `getPublicGradingProducts`; extend `submitGradingPayment` to accept an array of `{ product_id, amount }` and insert N rows.
- **`src/pages/public/PublicGradingPayment.tsx`**: Foundation checkbox group, payment method dropdown, bank transfer rendering, total calculation, multi-row submit.

## Out of scope

- No changes to `/grading-list`, approvals queue, or invoice generation logic.
- No changes to non-Foundation flows beyond branch pricing.
- No new bank info storage — reuses existing `invoice_templates`.
