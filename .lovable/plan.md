# /hello chat — payment flow upgrades

## Scope

1. **School Fees** — list only fee products previously invoiced for this student at this branch.
2. **Uniforms & Apparel** — list only products whose `products.allowed_belt_levels` contains the student's `current_belt` (empty/NULL array = not eligible; strict belt match).
3. **Grading** — add a required **Grading Slot** dropdown above "Add to cart"; remove the "Change grading" link.
4. **Protection Guards & Accessories** — deactivate all 16 existing items and replace with 4 curated sets. Pricing is stored once (Morley AUD). Singapore branches use a **discount line item** at checkout to land on the GST-inclusive Singapore price — no `price_rules` override.
5. **Invoice creation** — every chat payment auto-creates an invoice tagged to the matched student (status = **paid, pending verification**, mirrors existing chat-payment flow). Items, sizes, colours, gender, grading slot, and the Singapore discount line are persisted.
6. **Preorder dialog** — when any "Preorder" product is added to cart, show a dialog warning of a 3–4 week waiting period.
7. **Grading submission redirect** — after successful grading payment in /hello, redirect to `/grading-list` (instead of the generic done bubble).

---

## Database changes

### A. New product seed (Protection Guards & Accessories — category `117cdc13-1296-4651-bc4b-f0449873cbf1`)

Deactivate all 16 existing rows (`UPDATE products SET is_active=false WHERE category_id='117cdc13…'`). Insert four new products with Morley base price:

| Product | Base (Morley AUD) | SG target (SGD incl. 9% GST) | Variants (`available_variants`) |
|---|---|---|---|
| Gaonhae Arm, Shin & Groin Protector Set | 100.00 | 140.00 | `sizes: [XS,S,M,L,XL]`, `genders: [Male, Female]` |
| Adidas Arm, Shin & Groin Protector Set – Preorder | 165.00 | 185.00 | `sizes: [XS,S,M,L,XL]`, `genders: [Male, Female]` |
| Adidas Chestguard & Headgear Set – Preorder | 260.00 | 284.30 | `sizes: [1,2,3,4,5]`, `colors: [Red, Blue]` |
| Face Shield | 20.00 | 25.00 | none |

`requires_size = true` for the first three. `metadata` carries `{ "is_preorder": true }` for the two preorder sets and `{ "sg_target_price": <SGD> }` to drive the discount calculation.

### B. New RPC `get_public_chat_products_for_student(p_session_id, p_student_id, p_branch_id, p_category_id)`

Returns the same columns as `get_public_chat_products` plus metadata. Filtering rules per category:

- **School Fees** — only products that appear on at least one `invoice_items` row joined to `invoices` where `student_id = p_student_id` and `branch_id = p_branch_id` (any status).
- **Uniforms & Apparel** — only active products whose `allowed_belt_levels @> ARRAY[student.current_belt]` (skip when student has no belt).
- **Grading** — unchanged (existing flow already handles).
- **Protection Guards & Accessories** — all active products in the category for the branch (no belt/history filter).

All rows still apply `price_rules` for AUD vs SGD where present (used by School Fees / Uniforms only).

### C. New RPC `submit_public_chat_invoice(...)`

Single SECURITY DEFINER function that:

1. Validates the `public_chat_sessions` row matches the student.
2. Creates an `invoices` row tagged to `student_id` + `branch_id` with `status = 'paid'`, `payment_status = 'pending_verification'`, `source = 'public_hello_chat'`.
3. Inserts `invoice_items` for each cart line (product_id, size_variant captures size/colour/gender JSON, qty, unit_price = Morley base).
4. For Singapore branches: appends a single negative-amount `invoice_items` row labelled "Singapore branch adjustment (incl. 9% GST)" equal to `Σ(sg_target − base) × qty`, so the invoice total matches what the customer paid.
5. Inserts a `payments` row with proof URL + chosen method.
6. Returns `invoice_id` and `reference_number`.

`submitChatPayment` in `publicChatService.ts` is updated to call this RPC instead of inserting straight into `public_chat_payment_submissions` (we still log to that table for the audit trail).

---

## Frontend changes (`src/pages/public/PublicHelloChat.tsx`)

1. **Category-aware product fetch** — call `get_public_chat_products_for_student` for School Fees, Uniforms, and Protection. Grading keeps `getChatProducts`. Empty-state copy: "No matching items for your current belt." / "No past school fee items for this branch."
2. **Grading slot dropdown** — inside the grading block, reuse `getPublicGradingSlots(branchId, [], dobIso, currentBelt)` + the age filter from `PublicGradingPayment.tsx`. Render a `Select` above "Add to cart"; disable add until a slot is chosen. Persist `grading_slot_id` on the cart line and forward through `submit_public_chat_invoice`.
3. **Remove "Change grading"** — delete the `gradingOverride` link and toggle; always show the defaulted product (or "no grading available" fallback).
4. **Variant pickers** — extend `ProductRow` to render `genders` (Male/Female) when `available_variants.genders` is set, in the same pattern as `sizes` and `colors`. Selected size/colour/gender are concatenated into `size_variant` (`"M / Red / Male"`) for the invoice item.
5. **Singapore price display** — `ProductRow` shows the SG-inclusive price (from `metadata.sg_target_price`) to Singapore-branch users while the cart and invoice math run off the base price + discount line.
6. **Preorder warning dialog** — when an item with `metadata.is_preorder = true` is added, open a confirm dialog: "This is a preorder. Please allow 3–4 weeks for delivery." Cart only updates after confirmation.
7. **Grading redirect** — after `handleSubmitPayment` succeeds for category Grading, `navigate('/grading-list')` instead of moving to `payment_done`.

---

## Open questions

None remaining — Singapore prices, belt-filter strategy, invoice status, and old-product deactivation are all confirmed.
