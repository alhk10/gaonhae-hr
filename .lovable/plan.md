# /hello refinements

Focused changes to `src/pages/public/PublicHelloChat.tsx`, `src/services/publicChatService.ts`, and one Supabase migration.

## 1. Header rebrand
- Replace the "Hello 👋" text block with the Gaonhae Taekwondo logo (`/lovable-uploads/gaonhae-logo-transparent.png`, same asset used in `PublicGradingPayment.tsx`).
- Logo sits left of the (now removed) title area, height ~28px, retains the back button to its left when applicable.
- Drop the "Gaonhae Taekwondo" subtitle line.
- "Not what I'm looking for" button stays on the right.

## 2. Expanded student matching
Extend `match_student_by_identity` RPC so a match succeeds when `first_name + last_name + DOB + branch` align AND at least one of these additionally matches (any provided value):
- `gender` equals `students.gender`
- `email` equals `students.email` (case-insensitive)
- `contact` equals `students.phone` OR `students.emergency_contact_phone` OR `students.emergency_contact_2_phone` (normalized: strip spaces, suffix-compare to tolerate country-code variants)

If the caller supplies none of gender/email/phone, behavior is unchanged (name+DOB+branch only).

Update `matchStudentByIdentity` in `publicChatService.ts` to forward new optional params (`p_gender`, `p_email`, `p_phone`).

## 3. Country-code phone input
Replace the plain "Contact number (optional)" `<Input type="tel">` with the existing `@/components/ui/phone-input` `PhoneInput` (flag + dial-code dropdown). Value stored as the formatted string `+65 9123 4567`; the RPC normalizes.

## 4. No-match → email staff with submitted details
- Remove the existing `choice` card ("Register a new student / Make a payment / Sign up for free trial").
- On no-match, show a single card: "We couldn't find your record. Leave a remark and our team will contact you." with one optional `<Textarea>` for remarks and a Submit button.
- On submit: send a staff email (reuse `send-transactional-email` + the `hello-callback-request` template extended to render an identity block) containing all entered details: first name, last name, DOB, branch, gender, email, contact, plus the remark.
- Also log via the existing `public_chat_callback_requests` insert path so it appears in the staff Approvals queue.
- Show a thank-you bubble afterwards.

## 5. Pre-fetch term context + show lesson stats earlier
- "Loading term…" delay happens because `get_public_student_term_context` only fires once the user enters `lesson_request`. Move the `useQuery` `enabled` guard so it fires as soon as `matched` is set (stage `matched`); same for `getBranchTimetableSlots`, `getStudentTermBookings`, holidays — warm the cache.
- Expand `get_public_student_term_context` to also return:
  - `attended_this_month` — count of `student_scheduled_classes` (this enrollment) with `status = 'attended'` (or attendance-table equivalent) where `scheduled_date` falls in the current calendar month.
  - `missed_this_month` — same scope where `status = 'missed'` / `absent` (whichever the project uses for non-attendance) in the current calendar month.
  - `is_unlimited` — true when any active entitlement for this enrollment has unlimited sessions (e.g. `sessions_total IS NULL` or a dedicated `is_unlimited` flag — confirm in entitlements schema).
- In the matched welcome bubble, render a compact stats line:
  - Unbooked this term: **N** (or **∞** when `is_unlimited`)
  - Attended this month: **N**
  - Missed this month: **N**
  Use the infinity glyph `∞` for unlimited plans (Kayden-style).
- The calendar's existing unbooked badge becomes `∞` for unlimited students; the net-lesson guard is skipped for them.

## 6. Polish
Keep the unbooked-count badge in the calendar header (already implemented); it now hydrates instantly from cache and respects the unlimited case.

## Files
- `src/pages/public/PublicHelloChat.tsx` — header swap, phone input swap, no-match card, matched stats line, prefetch trigger, unlimited handling.
- `src/services/publicChatService.ts` — extend `matchStudentByIdentity` + `TermContext` types; add `submitNoMatchEnquiry` helper.
- Supabase migration — expand `match_student_by_identity` (additive optional params, backward compatible) and `get_public_student_term_context` (add `attended_this_month`, `missed_this_month`, `is_unlimited`). Grant to `anon, authenticated`.
- (Optional) `supabase/functions/_shared/transactional-email-templates/hello-callback-request.tsx` — render identity block when provided.

## Out of scope
- In-app student creation (handled offline by staff).
- Any change to `/pay`.
- Calendar interaction model.
