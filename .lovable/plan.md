# /hello Chat — Plan Update

Adds belt-aware grading defaulting on top of the previously approved `/hello` plan, including full Poom/Dan stage progression. All other steps (Identify, Register, Free Trial callback, Payment for other categories, Escape hatch + Callback email) remain unchanged.

## Change scope

When **a student is matched** in Step 1 AND the user picks **Payment → Grading** in Step 3:

1. Read the student's **current belt** from the database (`students.current_belt`).
2. Read the student's **grading history** for stage progression (count of completed stage gradings).
3. Compute the **next grading** using the rules below.
4. Pre-select the matching grading product in the product picker.
5. Show a chat bubble: e.g. "Current belt: 1st Poom. Next grading: Stage 2 (2 of 3). Tap to change."
6. Allow override via "Change grading" link → full grading product list for that branch.

## Next-grading rules

**Coloured belts (pre-Poom/Dan):**
- Default to the `From >> To` product whose `From` matches `current_belt`
  (e.g. Foundation 1 → "Foundation 1 >> Foundation 2").

**1st Poom / 1st Dan:** must complete **Stage 1, 2, 3** — **3 gradings total**
- Default to the next stage (1 → 2 → 3) based on how many of Stages 1–3 the student has already passed.
- After all 3 are done, default to "1st Poom >> 2nd Poom" (or "1st Dan >> 2nd Dan").

**2nd Poom / 2nd Dan:** must complete **Stages 4–10** — **7 gradings total**
- Default to the lowest Stage in 4–10 the student has not yet passed.
- After all 7 are done, default to "2nd Poom >> 3rd Poom" (or "2nd Dan >> 3rd Dan").

**3rd Poom / 3rd Dan:** must complete **Stages 11–26** — **16 gradings total**
- Default to the lowest Stage in 11–26 the student has not yet passed.
- After all 16 are done, fall back to the full list (no further auto-default).

**No belt on file / unknown belt:** skip auto-default, show full list with hint: "We don't have your current belt on file — please pick the grading that applies."

**No matching product at branch:** fall back to full list with: "No grading slot found for your next stage at this branch — please pick the closest option or use 'Not what I'm looking for'."

## Technical details

- **Belt source:** `students.current_belt` — extend `match_student_by_identity` return if not already exposed.
- **Stage history source:** count rows in `grading_registrations` (or equivalent paid/verified grading line items) joined to products, where the product name matches a Stage in the relevant Poom/Dan band. Only count **paid/verified** gradings.
- **Belt → product mapping:** reuse `src/utils/gradingProductBelts.ts` (`beltsForProductName`). New helper `nextGradingProductForStudent(currentBelt, completedStageNumbers, products)` lives alongside it.
- **Stage parsing:** extract the leading integer from product names beginning with "Stage N" (e.g. "Stage 7 Poom Test").
- **UI:** inline branch inside `PaymentProductStep.tsx` — chat bubble + "Use this" / "Change grading" buttons, then continue to existing variant → PayNow/Bank Transfer → proof upload → `public_chat_payment_submissions` flow.
- **Event log:** log `grading_default_applied` event into `public_chat_events` with `{ current_belt, completed_stages: number[], defaulted_product_id, overridden: boolean }`.
- **Schema:** no new tables. Only extend `match_student_by_identity` RPC to return `current_belt` if missing. Stage counts read live from existing grading tables.

## Out of scope

- Auto-defaulting grading for **unmatched** students.
- Multi-grading selection in one payment.
- Validating age, term, or minimum-lessons eligibility — staff still verify on payment review.
