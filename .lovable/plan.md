# Past-date booking + Competition slot visibility

## Why "Competition" is showing for Kayden

The "Available class times" list comes from the RPC `get_public_branch_timetable_slots`. A timetable slot is shown when ALL of these match the student:

1. Slot belongs to the student's branch and is active.
2. Student's age is within the slot's `age_from`–`age_to` range.
3. Slot's `belt_levels` is empty OR includes the student's `current_belt`.
4. The slot's `class_type` is included in the union of `class_type_scope` values from the student's active rows in the `entitlements` table (comma-separated scopes are split). If the student has no active entitlements, this filter is skipped and all class types pass.

Kayden's active entitlements in the database:

- Entitlement A — `class_type_scope = "Competition"`
- Entitlement B — `class_type_scope = "Kids, Junior, Little Gaonhae"`

So Competition is shown because he has an active entitlement whose scope is "Competition" (likely from a Competition-class invoice line item). To stop Competition from appearing, the underlying entitlement row needs to be deactivated or its invoice line item removed/refunded — not a UI change.

Note: `allowed_class_types` on the student record is currently NULL and is not consulted by this RPC. Eligibility is driven purely by entitlements + age/belt.

## Fix: prevent booking on past dates

Currently `isDateDisabled` intentionally allows past dates that already contain a booking, so the user can open the dialog and view attendance. But inside that dialog the "Available class times" section still lets the user tap a slot and add a new booking for that past date. That needs to be blocked.

### Change (frontend only, `src/pages/public/PublicHelloChat.tsx`)

In the slot dialog render (around line 1328–1380), when the selected date is in the past:

- Hide the "Available class times" section entirely (or render a single muted line: "Booking closed for past dates").
- Keep the "Your booked classes" section visible with attendance status.
- Keep "Clear day" disabled effect already handled by `cancellable` logic.

Implementation detail: compute `isPastDate = pickedDate < today` once at the top of the dialog body and gate the Available-times block + its onClick handlers on `!isPastDate`.

No RPC, service, or schema changes required.

## Verification

- Open Kayden on 21/05 (past): dialog opens, shows 17:00–17:55 Kids · Present, no "Available class times" section, "Done" closes.
- Open a future date in the term: Available class times still render and are bookable as today.
