

## Plan: Combined sibling reminder with term context & discount lines

### What changes

When clicking SMS or WhatsApp on an unpaid invoice in the **Invoice & Payment** tab, detect siblings (students sharing the same email) with unpaid invoices and compose **one combined message** that:
- Opens with the same term-context greeting used today (current term ended, next term commences in N days, runs from D1 to D2).
- Lists each sibling's invoice in its own block with items, **discount line(s)** if any, and a subtotal.
- Ends with a Grand Total, single bank-transfer block, and signature.

### Match rule (decided)

- **Match key**: same email (case-insensitive, trimmed). Mirrors existing sibling-discount logic.
- **Invoice scope**: every currently unpaid invoice for any matched sibling, across all terms. Status set: `draft, sent, unpaid, partial, partially_paid, overdue`.
- **Branch scope**: limited to the originally clicked invoice's branch (avoids mixing bank-transfer details).
- **Send target**: phone/WhatsApp number of the originally clicked student (unchanged).
- No siblings / no email / no other unpaid invoices → fall back to today's single-invoice template.

### New message layout

```
Good {Morning/Afternoon/Evening},

We have now reached the end of {current term name}. {next term name} {commence phrase} and will run from {next_start} to {next_end}.

Kindly arrange payment for your children before the start of the term:

{STUDENT 1 NAME} — Invoice {INV-NUMBER}
{product_1} – {amount_1}
{product_2} – {amount_2}
Discount ({label}): -{discount_amount}
Subtotal: {invoice_1_balance_due}

{STUDENT 2 NAME} — Invoice {INV-NUMBER}
{product_a} – {amount_a}
Discount: -{discount_amount}
Subtotal: {invoice_2_balance_due}

Grand Total: {sum_of_balance_due}

Payment can be made via bank transfer using the details below:
{branch bank transfer details}

Thank you for your continued support.
Gaonhae Taekwondo {branch}
```

Pluralisation: when only **one** student is in the message (i.e. siblings exist on email but only the clicked student has unpaid invoices, OR no siblings), use `your child` instead of `your children`. When there are no upcoming-term dates available, omit the second sentence and keep only the greeting + intro line, mirroring today's fallback.

### Discount detection per invoice

For each invoice, determine discount lines from `invoice_items`:
1. **Negative-amount line items** (e.g., automatic bundle discounts, sibling discounts already applied as a `-$10`/`-$20` line item) → render verbatim using the item's description: `{description}: -{abs(amount)}`.
2. **`invoice.discount_amount` field** (manual discount on the invoice header), if `> 0` → render `Discount: -{discount_amount}`.
3. If both exist, both are listed (matches current PDF behaviour).
4. If neither, the discount line is omitted entirely for that invoice block.

Subtotal per invoice uses **`balance_due`** (so partial payments are reflected).

### Implementation

1. **`src/utils/invoicePDFGenerator.ts`** — add a new exported helper:
   ```ts
   export const buildCombinedReminderMessage = (
     invoices: InvoiceData[],
     opts: {
       branchName?: string;
       bankInfo?: string;
       currentTermName?: string;
       nextTermName?: string;
       nextTermStart?: string;
       nextTermEnd?: string;
       commencePhrase?: string; // "next week" / "in 4 days" / "tomorrow"
     }
   ): string
   ```
   - Greeting (Morning/Afternoon/Evening based on local time).
   - Term-context sentence when term info is supplied (reuses the same phrase logic as `buildTermReminderMessage`).
   - Intro line: `Kindly arrange payment for your child(ren) before the start of the term:` (singular/plural based on distinct student count).
   - For each invoice block: `{STUDENT NAME} — Invoice {invoice_number}`, then each non-negative item as `{description} – {amount}`, then each negative-amount item AND the header `discount_amount` as a `Discount` line, then `Subtotal: {balance_due}`.
   - `Grand Total: {sum_of_balance_due}`.
   - Bank transfer block + signature (same as today).

   Keep `buildTermReminderMessage` unchanged for backward compatibility (still used by `InvoiceManagementList.tsx`), but **also update it** to include the discount line(s) under the items list using the same detection rules — so the single-invoice path benefits too.

2. **`src/components/dashboard/BranchDashboard.tsx`** — extend `handleShareSMS` and `handleShareWhatsApp`:
   - Resolve the clicked student's email. If empty → existing single-invoice path.
   - Query siblings + their unpaid invoices (one round-trip each):
     ```ts
     const { data: siblings } = await supabase
       .from('students')
       .select('id, first_name, last_name, email')
       .ilike('email', email.trim());

     const { data: invs } = await supabase
       .from('invoices')
       .select('id, invoice_number, student_id, balance_due, discount_amount, status, branch_id')
       .in('student_id', siblings.map(s => s.id))
       .eq('branch_id', invoice.branch_id)
       .in('status', ['draft','sent','unpaid','partial','partially_paid','overdue']);
     ```
   - Always include the originally clicked invoice (deduplicated). Sort by student name then invoice number.
   - Fetch full items via `getInvoiceById` in parallel (`Promise.all`); attach `student.name` from siblings result.
   - Resolve term context (current/next term, dates, commence phrase) once via the same helper used by the existing single-invoice path.
   - If `invoices.length === 1` → existing single-invoice send (now includes discount line via the updated `buildTermReminderMessage`).
   - Else → call `buildCombinedReminderMessage(invoices, { ...termCtx, branchName, bankInfo })`, then open `sms:` URL or `wa.me` URL using existing target normalization.
   - Toast when ≥2 invoices: `Combined reminder for {N} invoices across {M} student(s).`

3. **No DB changes**, no new tables, no edge functions. Reuses existing `students`, `invoices`, `invoice_items`, `invoice_templates`, `branches`.

### Edge cases

- Discount line item description missing → fall back to label `Discount`.
- Sibling has multiple unpaid invoices → each rendered as its own block in stable order.
- Invoice fully covered by credits but still `partial`/`unpaid` somehow → still listed; subtotal will show the actual balance.
- Multi-branch siblings → only same-branch invoices included.
- WhatsApp `wa.me` URL accepts long bodies up to ~60 KB encoded — adequate for typical 3–6 sibling invoices.

### Files affected

- `src/utils/invoicePDFGenerator.ts` — add `buildCombinedReminderMessage`; update `buildTermReminderMessage` to render discount line(s).
- `src/components/dashboard/BranchDashboard.tsx` — extend `handleShareSMS` and `handleShareWhatsApp` only.

No changes to:
- The Invoice PDF body.
- The Invoice & Payment list UI / button placement.
- Sibling discount calculation, tab counters, single-invoice overdue reminder template.

### Verification

1. Click WhatsApp on an unpaid invoice for a student with 2 siblings, each having 1 unpaid invoice → message shows greeting + term-context line + intro saying "your children" + 3 blocks (one per student) each with items, discount line where applicable, subtotal → Grand Total → bank info → signature.
2. Click SMS on the same invoice → identical body opens in SMS app.
3. Invoice with an automatic $20 sibling discount or $10 bundle discount → that line appears as `Discount: -$20.00` / `… -$10.00` between items and Subtotal.
4. Invoice with a manual header discount only (no negative line item) → single `Discount: -{amount}` line.
5. Invoice with both negative line items AND header discount → both lines shown.
6. Student with no siblings or no other unpaid invoices → falls back to single-invoice template, intro reads "your child", discount line still appears when applicable.
7. Sibling has invoices in another branch → excluded from the merge.
8. Toast shown when ≥2 invoices combined; not shown for single-invoice sends.

### Out of scope

- Cross-branch combined reminders.
- Matching siblings by phone/WhatsApp number.
- Updating the overdue reminder SMS template.
- Confirmation dialog before sending (auto-merge per prior decision).
- Updating `InvoiceManagementList.tsx` (Sales module) WhatsApp share.

