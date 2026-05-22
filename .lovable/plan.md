# /hello chat — payment flow upgrades

## Scope

1. **School Fees** — list only fee products previously invoiced for this student at this branch.
2. **Uniforms & Apparel** — list only products whose `allowed_belt_levels` contains the student's `current_belt` (strict match).
3. **Grading** — add a required **Grading Slot** dropdown above "Add to cart"; remove the "Change grading" link.
4. **Protection Guards & Accessories** — deactivate all 16 existing items; replace with 4 curated sets. Pricing stored once in Morley AUD. Singapore branches reach SG price via a **discount line item** at checkout (no `price_rules` overrides).
5. **Invoice creation** — every chat payment auto-creates an invoice tagged to the student, status **paid / pending verification**. Captures items, size/colour/gender, grading slot, term, and the SG adjustment line.
6. **Preorder dialog** — adding a preorder product opens a confirm dialog warning of a 3–4 week wait.
7. **Grading redirect** — successful grading payment redirects to `/grading-list`.
8. **Term selector + quantity for term-based products** — School Fees / Lesson products show a **Term** dropdown and **Quantity** field. Term defaults to the next unpaid term for this student at this branch. Quantity defaults to the number of weeks in that term.

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

### B. RPC `get_public_chat_products_for_student(session, student, branch, category)`

- **School Fees** — products that appear on past `invoice_items` for this student + branch. Each returned row also includes `is_term_based: true` so the UI shows term + quantity controls.
- **Uniforms & Apparel** — active products where `allowed_belt_levels @> ARRAY[student.current_belt]`.
- **Protection** — all active products in category.
- **Grading** — unchanged.

### C. New RPC `get_next_unpaid_term_for_student(student, branch)`

Returns the next term (id, name, start_date, end_date, weeks_count) for which the student has **no paid/verified invoice item** anchored to that term at this branch. Weeks count derived from term length minus public holidays (reuse existing term-week helper if present, else `ceil(days/7)`).

### D. RPC `submit_public_chat_invoice(...)` — extended payload

For term-based line items, payload includes `term_id` and `quantity`. The RPC writes `metadata.term_id` and `quantity` onto `invoice_items` so downstream invoice/term logic works (matches existing invoice schema).

## Frontend (`src/pages/public/PublicHelloChat.tsx`)

1. Use RPC for School Fees / Uniforms / Protection. Empty-state copy per category.
2. Grading block: required `Select` of eligible slots; disable "Add to cart" until chosen. Persist `grading_slot_id`. Remove "Change grading" link.
3. **Term-based products (`is_term_based`)** — render two extra controls inside `ProductRow`:
   - **Term** `Select` — options from `get_next_unpaid_term_for_student` plus the following 1–2 upcoming terms. Default selection = the next unpaid term. If all terms are paid, show empty-state "All terms paid".
   - **Quantity** number input — defaults to the selected term's `weeks_count`; user can adjust (min 1, max weeks_count).
   - Line total = `unit_price × quantity`. Cart line stores `{ term_id, term_name, quantity }`.
4. Uniforms/Protection: variant pickers (size/colour/gender) as before.
5. Singapore branch: SG-inclusive display price; cart total = Morley base × qty + SG adjustment line.
6. Preorder confirm dialog before cart add.
7. Successful grading payment → `navigate('/grading-list')`.

## Out of scope

No changes to existing branch/student matching, OTP, or auth flow. Other categories' UX unchanged.
