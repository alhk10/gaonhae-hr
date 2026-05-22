# /hello chat — payment flow upgrades

## Scope

1. **School Fees** — list only fee products previously invoiced for this student at this branch.
2. **Uniforms & Apparel** — list only products whose `allowed_belt_levels` contains the student's `current_belt` (strict match).
3. **Grading** — add a required **Grading Slot** dropdown above "Add to cart"; remove the "Change grading" link.
4. **Protection Guards & Accessories** — deactivate all 16 existing items; replace with 4 curated sets. Pricing stored once in Morley AUD. Singapore branches reach SG price via a **discount line item** at checkout (no `price_rules` overrides).
5. **Invoice creation** — every chat payment auto-creates an invoice tagged to the student, status **paid / pending verification**. Captures items, size/colour/gender, grading slot, and the SG adjustment line.
6. **Preorder dialog** — adding a preorder product opens a confirm dialog warning of a 3–4 week wait.
7. **Grading redirect** — successful grading payment redirects to `/grading-list`.

## Database

### A. Replace Protection Guards & Accessories (category `117cdc13…`)

Deactivate all 16 existing rows, then insert:

| Product | Morley AUD | SG SGD (incl. 9% GST) | Variants |
|---|---|---|---|
| Gaonhae Arm, Shin & Groin Protector Set | 100 | 140 | sizes XS–XL, gender M/F |
| Adidas Arm, Shin & Groin Protector Set – Preorder | 165 | 185 | sizes XS–XL, gender M/F |
| Adidas Chestguard & Headgear Set – Preorder | 260 | 284.30 | sizes 1–5, colors Red/Blue |
| Face Shield | 20 | 25 | — |

`metadata` carries `{ is_preorder: true }` and `{ sg_target_price: <SGD> }` where relevant.

### B. New RPC `get_public_chat_products_for_student(session, student, branch, category)`

- **School Fees** — products that appear on past `invoice_items` for this student + branch.
- **Uniforms & Apparel** — active products where `allowed_belt_levels @> ARRAY[student.current_belt]`.
- **Protection** — all active products in category.
- **Grading** — unchanged.

### C. New RPC `submit_public_chat_invoice(...)`

SECURITY DEFINER function:
1. Validates session matches student.
2. Creates `invoices` row (student + branch, `status='paid'`, `payment_status='pending_verification'`, `source='public_hello_chat'`).
3. Inserts `invoice_items` per cart line (size/colour/gender → `size_variant`).
4. Singapore branches: appends negative `invoice_items` row "Singapore branch adjustment (incl. 9% GST)" so totals match what the customer paid.
5. Inserts `payments` row with proof URL + method.
6. Returns `invoice_id` + reference number.

`publicChatService.submitChatPayment` switches to call this RPC.

## Frontend (`src/pages/public/PublicHelloChat.tsx`)

1. Use new RPC for School Fees / Uniforms / Protection (Grading keeps existing fetch). Empty-state copy per category.
2. Grading block: render `Select` of eligible slots (reuse `getPublicGradingSlots` + age filter from `PublicGradingPayment.tsx`). Disable "Add to cart" until a slot is chosen. Persist `grading_slot_id` on the cart line.
3. Remove the "Change grading" link/toggle; always show the defaulted product.
4. Extend `ProductRow` to render a `genders` picker when present. Selection encoded as `"M / Red / Male"` into `size_variant`.
5. Singapore-branch users see SG-inclusive price (from `metadata.sg_target_price`); cart maths still use Morley base + discount line.
6. Adding a preorder item opens a confirm dialog ("Please allow 3–4 weeks for delivery") before cart update.
7. After successful grading payment → `navigate('/grading-list')`.

## Out of scope

No changes to existing branch/student matching, OTP, or auth flow. Other categories' UX unchanged.
