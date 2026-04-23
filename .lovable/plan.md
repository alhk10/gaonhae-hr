

## Plan: Fix SMS message — invoice term is the *upcoming* term, not the ending one

### What's wrong

For Hannah's invoice (item term = **Term 2 2026**), the SMS reads:
> "We have now reached the end of **Term 2 2026**. **Term 3 2026** will commence next week and will run from 13/07/2026 to 18/09/2026."

It should read:
> "We have now reached the end of **Term 1 2026**. **Term 2 2026** will commence next week and will run from 28/04/2026 to ..."

The current code treats the invoice's `metadata.term_id` as the **ending** term. Conceptually, an invoice raised before a term starts is for the **upcoming** term — so the invoice's term is the term that will *commence next week*, and the *ending* term is the one immediately before it.

### Fix

**`src/components/dashboard/BranchDashboard.tsx` — `handleShareSMS` (lines ~385–408)**

Re-interpret the invoice-anchored term as the **next** (upcoming) term, and resolve the **ending/previous** term from it:

1. Read `term_id` from the invoice's line-item metadata as before → call this `invoiceTerm` (the upcoming term).
2. Add a new helper `getPreviousTerm(branchId, beforeStartDate)` in `termCalendarService.ts` (mirror of `getNextTerm`, ordered DESC, `start_date < beforeStartDate`).
3. Set `endingTerm = await getPreviousTerm(branchId, invoiceTerm.start_date)`.
4. Build `smsTerms = { current: endingTerm, next: invoiceTerm }` and pass to `shareInvoiceViaSMS`.

Fallback chain when no `term_id` is present on any line item (unchanged in spirit, but corrected semantics):
- Try `getUpcomingTerm(branch)` → use as `next`; previous of that becomes `current`.
- Else fall back to `getCurrentTerm(branch)` as `current` and `getNextTerm(branch, current.end_date)` as `next` (the original behavior, only used when no invoice-anchored term and no upcoming term exist).

**`src/services/termCalendarService.ts`**

Add `getPreviousTerm(branchId, beforeStartDate)`:

```text
.from('term_calendars')
.eq('branch_id', branchId)
.eq('is_active', true)
.lt('start_date', beforeStartDate)
.order('start_date', { ascending: false })
.limit(1)
```

Returns the term immediately preceding the given start date, with branch name + breaks attached (same shape as the other helpers).

**`src/utils/invoicePDFGenerator.ts` — `shareInvoiceViaSMS`**

No change to the template strings. The opening already reads:
> "We have now reached the end of `{current.name}`. `{next.name}` will commence next week and will run from `{next.start_date}` to `{next.end_date}`."

It will now render correctly because `current` = the previous term (Term 1 2026) and `next` = the invoice's term (Term 2 2026).

The existing `deriveNextName` fallback (incrementing "Term N YYYY" → "Term N+1 YYYY") stays as a last-resort safety net but won't be needed for invoice-anchored cases.

### Verification

1. Hannah Song (Morley, Term 2 2026 invoice) → blue SMS:
   `"We have now reached the end of Term 1 2026. Term 2 2026 will commence next week and will run from 28/04/2026 to <Term 2 end>."`
   followed by Items, Total, AU bank details, closing.
2. SG branch invoice for Term 2 2026 → SMS reads "end of Term 1 2026. Term 2 2026 will commence …" with SG dates and ANEXT BANK details.
3. Invoice with no `term_id` on items but an upcoming term exists → SMS uses upcoming term as `next` and the term before it as `current`.
4. Invoice with no `term_id` and no upcoming term → falls back to current term as `current` and the next chronological term as `next` (legacy behavior).
5. Red overdue SMS button → unchanged (uses `currentTerm` only, not affected by this fix).
6. WhatsApp button → unchanged.

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` — flip `handleShareSMS` semantics: invoice term = next; previous term = current.
- `src/services/termCalendarService.ts` — add `getPreviousTerm` helper.
- `src/utils/invoicePDFGenerator.ts` — no change.

### Out of scope

- Overdue SMS template.
- WhatsApp template.
- Bank transfer content / phone number storage.

