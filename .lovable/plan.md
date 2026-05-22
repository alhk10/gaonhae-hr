# /hello chat refinements

## Changes

1. **Hide "Not what I'm looking for" on identify step**
   - In `PublicHelloChat.tsx`, the top-right help button currently renders on every step. Wrap it so it's hidden when `step === 'identify'` (first step).

2. **Rename "Not what I'm looking for" → "Help"**
   - Update the button label (and icon stays as HelpCircle). Applies to all steps where it still shows.

3. **Quantity field for Competition Class (ad-hoc lessons)**
   - Today, qty input only renders for `is_term_based` rows. Ad-hoc lessons currently force `qty = 1`.
   - Show a qty input for ad-hoc lessons too (any non-uniform lesson product), default 1, min 1. Use the same compact stepper styling as term-based rows.
   - On Continue, build the cart item with the picked qty instead of hard-coded 1.

4. **Schedule lessons after payment**
   - After a successful payment for any lesson item (term-based OR ad-hoc) in the cart, route the user to a new "schedule lessons" step.
   - For each paid lesson item, show the entitlement(s) just created and let the user pick class slot(s) from the existing branch timetable, respecting age/belt/branch eligibility and avoiding public holidays (same rules as student portal self-booking).
   - On submit, write bookings to `class_slot_bookings` (or current booking table) tied to the student + entitlement; show confirmation.
   - Skip the scheduling step entirely if the cart contains no lesson items (uniform-only, grading-only, etc.).

## Technical notes

- Files: `src/pages/public/PublicHelloChat.tsx` (UI, step machine, qty for ad-hoc), `src/services/publicChatService.ts` (fetch available slots + submit bookings RPC wrapper).
- New step key e.g. `'schedule'` inserted between current `payment_success` and end-of-flow.
- Reuse existing slot eligibility logic from the student portal "My Classes" booking (filter by age, belt, branch, entitlement; exclude public holidays). If a shared helper doesn't exist, add a thin RPC `get_public_chat_bookable_slots(student_id, entitlement_id)` mirroring portal rules.
- Booking insert via existing booking RPC if available, otherwise a new `create_public_chat_booking` SECURITY DEFINER function that validates eligibility server-side before insert.
- No change to invoice / payment logic.

## Out of scope

- Grading slot flow (already handled).
- Backfilling past invoices.
- Editing/cancelling bookings post-confirmation (user can do it from portal later).
