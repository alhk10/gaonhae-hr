# Show the right term-fee classes in the Hello chat

On /hello, after a visitor's details are matched, the "School Fees — pick item(s)" step shows "No items available for this branch right now." for students who have never been billed before, and can show classes that don't suit the student's belt.

## Why it happens

The chat's fee list only offers classes the student has *already* been invoiced for at that branch. Carissa Masters (Bukit Merah, 3rd Dan, active) has no invoices at all, so the list comes back empty — even though Bukit Merah has 15 class packages set up with branch prices.

## New rules

Show a class in the Hello chat's School Fees step when **all** of these hold:

1. The class is active and priced for the student's branch (the same branch availability the public /fees page uses — an active price rule, current dates, branch price applied).
2. The class suits the student's belt: the student's current belt is in the class's allowed belt list. Classes with no belt list stay visible to everyone.
3. One-off items (Trial Lesson, Ad-Hoc Lesson, Private Lesson) stay out of this list.

On top of that, any class the student has previously been invoiced for at that branch always stays in the list, even if its belt list has since changed — so returning students can renew what they already attend. Previously-billed classes are sorted first, then the rest by name.

Everything else in the chat (uniforms, guards, grading, terms, pricing, checkout) is unchanged.

## What the user sees

- Carissa (3rd Dan, Bukit Merah) sees the Bukit Merah "Black Tip & Above" weekday/weekend packages at Bukit Merah prices, instead of an empty list.
- A Foundation/colour-belt student at the same branch sees the "Foundation to Red" and age-appropriate packages instead.
- The empty-state message only appears when the branch genuinely has no classes priced for it.

## Technical detail

- Rewrite the `get_public_chat_products_for_student` database function's school-fees branch of the WHERE clause. Replace the "must exist in invoice_items" condition with:
  - `EXISTS` an active `price_rules` row for `(product_id, p_branch_id)` within effective dates, mirroring `get_public_class_products`;
  - `AND (p.allowed_belt_levels IS NULL OR p.allowed_belt_levels @> ARRAY[current_belt])`;
  - `AND p.name NOT IN ('Trial Lesson','Ad-Hoc Lesson','Private Lesson')`;
  - `OR` the existing prior-invoice `EXISTS` clause (kept as an always-include escape hatch).
- Add a `previously_billed` sort key so prior-invoice items come first; keep the existing return signature (`is_term_based`, `metadata`, etc.) intact so `PublicHelloChat.tsx` and `publicChatService.ts` need no changes.
- Uniform / protection / other categories keep their current conditions.
- Verify afterwards by running the function for Carissa's student ID at `bukit-merah` and by walking the /hello flow in the browser.
