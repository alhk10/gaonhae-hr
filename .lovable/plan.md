# Ad-hoc lessons: drop term picker, fix term-paid detection

## Problem (investigation)

Kayden's School Fees step shows **Competition Class** with a Term dropdown defaulting to **"Term 3 2026 · paid"**, even though only Term 2 2026 was paid for an *Unlimited* (regular term) lesson. No Term 3 invoice exists.

Database confirms: invoice `INV-2026-00298` (issue date 30/04/2026) contains a **Competition Class** line whose `invoice_items.metadata.term_id` = the Term 3 2026 UUID. Competition Class is `products.is_adhoc_lesson = true` — it should never carry a `term_id`, but historical data has one anyway.

Two bugs surface from this:

1. **Ad-hoc lessons render a term selector.** The current `get_public_chat_products_for_student` flags any product in the School Fees category as `is_term_based`, including `Competition Class`. Per project convention ad-hoc lessons hide term controls.
2. **"Paid" detection in `get_public_chat_terms_for_student` is too loose.** It marks a term as paid if *any* invoice item's `metadata->>'term_id'` matches, regardless of whether the product is a real term-based lesson. So the stray ad-hoc Competition Class item makes Term 3 look paid.

## Fix

### 1. RPC `get_public_chat_products_for_student`
- Change the `is_term_based` flag to:
  `p.category_id = school_fees AND COALESCE(p.is_lesson, false) = true AND COALESCE(p.is_adhoc_lesson, false) = false`
- Effect: Competition Class (and any other ad-hoc lesson) returns `is_term_based = false`, so the frontend skips the Term + Quantity controls and treats it as a regular per-unit product.

### 2. RPC `get_public_chat_terms_for_student`
- Tighten the `is_paid` EXISTS subquery so it only counts invoice items whose product is a real term-based lesson:
  - join `products p ON p.id = ii.product_id`
  - require `p.category_id = school_fees_category` AND `COALESCE(p.is_lesson, false) = true` AND `COALESCE(p.is_adhoc_lesson, false) = false`
- Effect: a stray `term_id` on a Competition Class item no longer counts; only genuine term lesson payments mark a term as paid. Kayden's next-unpaid term will correctly resolve to Term 3 2026.

### 3. Frontend (`PublicHelloChat.tsx`, `ProductRow`)
- Already gated on the `is_term_based` flag — no UI change needed once the RPC returns the corrected value. Ad-hoc lessons will render as a plain product with a single `Add to cart` (qty 1, no term).

## Out of scope

- Backfilling historical `invoice_items.metadata` to strip `term_id` from ad-hoc lessons. Not needed once the RPC ignores them.
- Changes to invoice creation paths (separate concern; this plan only fixes the public `/hello` flow).
