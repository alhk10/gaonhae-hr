

## Plan: Fix SMS reminder so the full template always renders correctly

### What's wrong

Current screenshot shows:
- Opening line ends at "next term will commence next week." (no term date range)
- Bank transfer details and closing line missing entirely

The template strings in `shareInvoiceViaSMS` already match the user's spec, but the message degrades when:
1. **Term resolution fails** between terms (e.g. Hannah, Morley, 23/04/2026 — Term 1 2026 ended 10/04, Term 2 2026 starts 28/04). `getCurrentTerm` returns null, fallback uses `getMostRecentTerm`, and `getNextTerm` may not match cleanly → user sees "The next term will commence next week" with no dates and no proper next-term name.
2. **No term context anchored to the invoice** — the SMS uses branch-level "current term" instead of the term the invoice was actually issued for. This is incorrect: an invoice raised for Term 2 should always reference Term 2 ending and Term 3 starting, regardless of today's date.
3. The trailing sections (bank info + closing) are present in code but the user's screenshot suggests they were silently dropped — likely because the SMS app truncated, or the message body never built them due to an earlier failure path. We'll harden by always including them.

### Target message (final)

```
We have now reached the end of {Term X YYYY}. {Term X+1 YYYY} will commence next week and will run from {DD/MM/YYYY} to {DD/MM/YYYY}.

Kindly arrange payment before the start of the term as follows:

Items:
{product_1} – {amount_1}
{product_2} – {amount_2}

Total: {total_amount}

Payment can be made via bank transfer using the details below:
{branch bank transfer details}

Thank you for your continued support.
Gaonhae Taekwondo ({branch})
```

### Implementation

**1. `src/components/dashboard/BranchDashboard.tsx` — `handleShareSMS`**

Resolve term context **from the invoice itself**, not from "today":

- Inspect `fullInvoice.items[*].metadata.term_id`.
- Pick the term referenced by the most recent (or any) lesson line item → this is the **ending term** the message should reference.
- Look up that term in `term_calendars` (id, name, start_date, end_date, branch_id).
- Call `getNextTerm(branchId, endingTerm.end_date)` to resolve the **next term**.
- Pass both into `shareInvoiceViaSMS` as `terms.current` (the ending term) and `terms.next`.

Fallback chain when no item has a `term_id`:
1. `getCurrentTerm(branch)` → 2. `getMostRecentTerm(branch)` (existing behavior).

**2. `src/utils/invoicePDFGenerator.ts` — `shareInvoiceViaSMS`**

Tighten the body so missing data degrades gracefully but still looks correct:

- If `terms.next.name` is missing, derive a sensible label (e.g. increment from `current.name` like "Term 2 2026" → "Term 3 2026"); otherwise keep generic "The next term".
- If `terms.next.start_date`/`end_date` are missing, omit the "and will run from … to …" clause cleanly (no dangling " and will run from to .").
- Always append the bank-transfer section and the closing line — never short-circuit them.
- Keep en-dash item separator and the existing item description format (`{description} – {amount}`), one per line.
- Keep the closing line on its own line:
  `Thank you for your continued support.\nGaonhae Taekwondo ({branch})`

No change to the WhatsApp helper or to `shareInvoiceOverdueReminderViaSMS` (separate template, separate path).

**3. Helper added to `src/services/termCalendarService.ts`**

Add `getTermById(termId: string)` (thin wrapper over `term_calendars` select by id, returning `Term | null`) so `BranchDashboard.handleShareSMS` can resolve the invoice-anchored term in one call.

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` — switch term resolution in `handleShareSMS` to use the invoice's `metadata.term_id` first, branch fallback second.
- `src/utils/invoicePDFGenerator.ts` — harden `shareInvoiceViaSMS` body (no dangling clauses, always include bank info + closing, smarter next-term name fallback).
- `src/services/termCalendarService.ts` — add `getTermById` helper.

### Verification

1. Branch Dashboard → Hannah Song's invoice (Morley, Term 2 2026 line item) → blue SMS button → message reads:
   `We have now reached the end of Term 2 2026. Term 3 2026 will commence next week and will run from 13/07/2026 to 18/09/2026.`
   followed by Items, Total, AU bank transfer details (BSB 803 439, Acct 238 648 651), then "Thank you for your continued support. Gaonhae Taekwondo (Morley)".
2. SG branch invoice (e.g. Yishun, Term 1 2026 line item) → SMS resolves Term 2 2026 dates (04/04/2026 → 28/06/2026) and SG bank info (ANEXT BANK).
3. Invoice with no `term_id` in any item → falls back to current/most-recent term (existing behavior), still produces a clean message with no dangling phrases.
4. Red overdue SMS button → unchanged behavior, unchanged template.
5. WhatsApp button → unchanged (still text-only, deep link).

### Out of scope

- WhatsApp template/launch logic (unchanged).
- Overdue SMS template (unchanged).
- Bank transfer details content (already populated for SG and AU).
- Stored phone numbers.

