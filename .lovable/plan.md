## Changes to `PublicGradingPayment.tsx`

### 1. Age-based belt transition logic

Compute student age (in years) from DOB. Apply age gating before product lookup:

- **Black Tip** → if age < 15 → target `Black Tip >> 1st Poom`; if age ≥ 15 → target `Black Tip >> 1st Dan`
- **1st Poom** → if age < 15 → `1st Poom >> 2nd Poom`; else block with message
- **2nd Poom** → if age < 15 → `2nd Poom >> 3rd Poom`; else block
- **3rd Poom** → if age < 15 → `3rd Poom >> 4th Poom`; else block

When blocked, show: "We are unable to process your grading. Please speak to a master for more information." and disable submit.

For these belts, pass an explicit target product name to `getPublicGradingProducts` rather than relying on the generic `belt >>%` LIKE match. Two options:
- (a) Extend RPC `get_public_grading_products` to accept optional explicit target product names per belt and match `lower(p.name) = lower(target)`.
- (b) Keep RPC as-is; fetch all matching variants and filter client-side by chosen target.

Plan: **option (a)** — add a second optional parameter `p_target_belts text[]` (parallel array). When provided for a belt, match exact `current >> target` instead of prefix. Foundation belts and others pass NULL to keep current behaviour.

### 2. GST (9%) for Singapore branches

Read `selectedBranch.country`. If country === `'Singapore'`:
- Display GST line (9% of subtotal) and a new Total in the product summary card.
- Submit button shows GST-inclusive total.

GST handling on backend submissions: the per-item `amount` continues to be the branch price (pre-GST). Add an aggregate `gst_amount` and `total_amount` only for display — no schema change. (Tax accounting on the verified invoice side is already handled when staff convert the submission.)

If you'd like GST persisted on each `grading_payment_submissions` row, say so and I'll add a nullable `gst_amount` column.

### 3. UI

- Add a "Target Grading" line under product card when age-resolved.
- Block message rendered as `<Alert variant="destructive">`.
- Subtotal / GST 9% / Total breakdown shown when SG branch.

## Files

- `supabase/migrations/<new>.sql` — replace `get_public_grading_products` to accept optional `p_target_belts text[]`.
- `src/services/gradingPaymentSubmissionService.ts` — extend `getPublicGradingProducts` signature.
- `src/pages/public/PublicGradingPayment.tsx` — age helper, target resolution, GST math, blocked-state UI.

## Out of scope
- No changes to non-public grading flows.
- No changes to invoice/tax accounting downstream.
