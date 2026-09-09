# Show only relevant classes, and mark the dates being paid for

On the /hello "plan your lessons" step, the day's class list currently shows every class at the branch that fits the student's age and belt — including Private Lesson and class types the chosen package doesn't cover (screenshot: a Little Gaonhae student is offered two Private Lesson slots). The calendar also gives no hint of which dates the payment actually covers.

## What changes

1. **Only classes the package pays for**
   Each class package already lists the class types it covers (e.g. "Little Gaonhae 2x Weekday" covers Little Gaonhae only) and the days of the week it applies to. The lesson picker will show only classes matching both, on top of the existing age/belt/branch filtering. Private Lesson never appears unless the student is actually buying Private Lesson.
   If a day has classes but none are covered by the package, the day shows "No classes covered by this package on this day."

2. **Show the dates being paid for**
   Dates covered by the payment are visually marked on the calendar (soft primary tint) so the student can see the paid period at a glance:
   - Full-term payment: every class-running date from term start to term end.
   - Four-week payment: the four-week window beginning at the term start, or at today's date if the term is already underway.
   Dates outside the paid window stay unselectable, as today.
   Public holidays and non-class days are not marked.

3. **Highlight picked dates**
   Any date with at least one lesson chosen gets a filled/ringed marker plus a small count when more than one lesson is picked that day, so choices stay visible while moving between months. The picked slot rows keep their current highlighted style.

4. **Legend**
   A one-line legend under the calendar: "Paid period · Lesson picked".

## Technical detail

- `get_public_chat_products_for_student`: add `allowed_class_types` to the metadata object it already builds (alongside `lessons_per_week` and `lesson_days`). No signature change.
- `PublicHelloChat.tsx`, fees_schedule stage:
  - Derive `planClassTypes` and `planLessonDays` from `feeCartItem.product.metadata`; filter `planSlotsByWeekday` / `planSlotsForDate` by class type (case-insensitive, trimmed) and weekday name. When metadata is missing, fall back to current behaviour (no extra filtering).
  - Compute `paidRange` = `{ from, to }`: term start/end for full-term; for `four_weeks`, `max(termStart, today)` + 27 days capped at term end.
  - Add react-day-picker `modifiers` (`paid`, `picked`) and `modifiersClassNames` on the existing `Calendar`, using tokens from the design system (no hardcoded colours).
  - `isPlanDateDisabled` also excludes dates outside `paidRange`.
  - Allowance stays `weeks × lessons_per_week`.
- No change to payment submission or `attach_public_chat_planned_schedule`.
