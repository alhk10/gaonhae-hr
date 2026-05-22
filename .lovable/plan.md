# /hello — Term filter, gender prefill, variant gating

Three refinements to `PublicHelloChat.tsx` (and one small RPC/service change for gender).

## 1. Hide already-paid terms from the term dropdown

In `ProductRow`, the term `<Select>` currently lists every term and tags paid ones with "· paid". Change it to filter them out entirely so the user can only pick unpaid terms.

- `terms` prop → derive `selectableTerms = terms.filter(t => !t.is_paid)`.
- Use `selectableTerms` for the dropdown options.
- `defaultTerm` becomes `selectableTerms[0]` (already the next unpaid term since the RPC orders chronologically).
- If `selectableTerms.length === 0`, render a small muted note ("All terms paid") and treat the product as not-addable (disable continue logic for that row).

Effect: For Kayden, Term 2 2026 (paid) disappears; Term 3 2026 becomes the default and only option.

## 2. Prefill gender from the matched student record

Today gender is collected in the identify step and used only for the lookup. When a student is matched, we should pull their stored gender from the database and use it as the default for any variant `Pick gender` selector.

### Backend
`get_public_chat_match_student` RPC (used by `matchStudentByIdentity`) currently returns `{ id, first_name, last_name, current_belt, status }`. Extend it to also return `gender` (read from `students.gender`).

### Frontend
- Extend `MatchedStudent` interface with `gender: string | null`.
- In `ProductRow`, accept a new optional `defaultGender` prop.
- Resolution order for the gender variant default:
  1. `matched.gender` (DB)
  2. Identify-step `gender` state (what they typed)
  3. Empty → user must pick on the spot
- The `<Select>` still renders; if a default is set, it is pre-selected (and not disabled, so they can override).

## 3. Variant gating + auto-add on Continue (non-grading products)

Currently every product card always shows size/colour/gender dropdowns and an "Add to cart" button. New behaviour:

- **Hide variant selectors until the product is "picked"**. The card shows only name, price, and badges by default.
- Tapping the card body toggles a `picked` state for that row.
- When `picked = true`:
  - Card is highlighted (`border-primary ring-1 ring-primary/40`).
  - Variant selects (size / colour / gender), and the term + qty row for term-based products, expand below.
- **Remove the "Add to cart" button entirely** from `ProductRow`.
- The page-level **Continue** button (already present at the bottom of `payment_products`) becomes the single commit point:
  - On click, validate every picked row (required size / colour / gender / term selected).
  - If any picked row is invalid, toast the first error and stay.
  - Otherwise build the cart from all picked rows (replacing any previous cart for this stage) and `goTo('payment_pay')`.
  - Preorder rows skip the existing per-item confirmation dialog and are committed directly (consistent with grading flow). If we want to keep the preorder warning we show it once at Continue listing all preorder items.
- The cart preview block below the product list goes away for non-grading (cart is derived implicitly from picked rows).
- "Continue" is disabled when zero rows are picked.

### State changes
- `ProductRow` exposes its internal state through controlled props OR the parent tracks a `Map<productId, RowDraft>` and `ProductRow` calls `onChange`. Preferred: lift selection state into a parent `rowDrafts` map so Continue can read everything in one place. `RowDraft = { picked, size, color, gender, termId, qty }`.
- `addToCart` / `commitCartItem` plumbing kept for grading but bypassed for the new non-grading flow.

## Out of scope
- Grading flow (already uses Continue auto-add — unchanged).
- Backfilling historical invoices.
- Any change to the proof-of-payment / `payment_pay` stage.

## Files touched
- `src/pages/public/PublicHelloChat.tsx` — ProductRow refactor, Continue logic, cart preview removal.
- `src/services/publicChatService.ts` — `MatchedStudent.gender` typing.
- Migration — extend `get_public_chat_match_student` RPC to return `gender`.
