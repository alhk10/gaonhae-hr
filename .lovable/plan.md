

## Plan: Update SMS message to include term-end / next-term context

### New message format

```
We have now reached the end of {current_term_name}. {next_term_name} will commence next week and will run from {next_term_start} to {next_term_end}.

Kindly arrange payment before the start of the term as follows:

Items:
{product_1} – {amount_1}
{product_2} – {amount_2}

Total: {total_amount}

Payment can be made via bank transfer using the details below:
{branch_bank_transfer_info}

Thank you for your continued support.
Gaonhae Taekwondo ({branch})
```

Dates rendered as DD/MM/YYYY via `formatDate` from `@/utils/dateFormat`.

### Where the term info comes from

`term_calendars` table, scoped to the invoice's `branch_id`:
- **Current term** = `getCurrentTerm(branchId)` (or `getMostRecentTerm` as fallback).
- **Next term** = first row where `branch_id = X`, `is_active = true`, `start_date > current_term.end_date`, ordered by `start_date asc`, limit 1.

If either is missing the line is gracefully omitted / replaced with sensible fallback (e.g. "the current term" / "The next term").

### Implementation

**1. `src/services/termCalendarService.ts`** — add a small helper:

```ts
export async function getNextTerm(branchId: string, afterDate: string): Promise<Term | null>
```
Queries `term_calendars` for the next active term after `afterDate` for that branch.

**2. `src/utils/invoicePDFGenerator.ts`** — extend `InvoiceData.branch` typing (or pass extra arg) so SMS can receive optional `currentTerm` / `nextTerm` objects with `{ name, start_date, end_date }`. Update `shareInvoiceViaSMS` to build the new message body with the en-dash separator (`–`) between item description and amount, formatted dates, and the new wording. Falls back cleanly if term info is missing.

**3. `src/components/dashboard/BranchDashboard.tsx`** — in `handleShareSMS`:
- After resolving `invoice.branch_id`, fetch `currentTerm = getCurrentTerm(branch_id) ?? getMostRecentTerm(branch_id)`.
- If `currentTerm` exists, fetch `nextTerm = getNextTerm(branch_id, currentTerm.end_date)`.
- Pass both to `shareInvoiceViaSMS` (e.g. via a new optional `terms` arg or as part of `InvoiceData`).

### Files affected

- `src/services/termCalendarService.ts` — add `getNextTerm` helper.
- `src/utils/invoicePDFGenerator.ts` — new SMS body format, accept current/next term info, format dates DD/MM/YYYY.
- `src/components/dashboard/BranchDashboard.tsx` — fetch current + next term and pass to `shareInvoiceViaSMS`.

### Verification

1. Branch Dashboard → Invoice & Payment → click MessageSquare icon on a term invoice.
2. SMS app opens with body matching the new template; dates render as `DD/MM/YYYY`; items use ` – ` separator; bank info follows; signature line `Gaonhae Taekwondo ({branch})`.
3. If branch has no current term, the opening sentence falls back to a generic phrasing rather than blank/undefined.
4. Existing WhatsApp button, PDF download, and other invoice actions unaffected.

### Out of scope

- Surfacing the new SMS button on Sales > Invoice Management (still Branch Dashboard only).
- Changing WhatsApp message format.
- Bulk send / scheduled reminders.

