

## Plan: Add 2nd SMS button for late payment reminders

### New "Overdue" SMS button

A second icon button next to the existing blue "Send via SMS" button on each invoice row in the **Branch Dashboard → Invoice & Payment** tab. Shown only for invoices that are actually overdue (status `unpaid`, `partial`, `partially_paid`, `sent`, `overdue`, or `draft` — i.e. has `balance_due > 0` AND `due_date < today`). Hidden for paid/verified/cancelled invoices.

- Icon: `AlertCircle` (lucide) in **red** (`text-red-600`), tooltip "Send overdue reminder".
- Sits between the existing blue SMS button and the View button.

### Message template

```
This is a reminder that your payment for {current_term_name} is now {days_overdue} days overdue.

Please arrange payment immediately as follows:

Items:
{product_1} – {amount_1}
{product_2} – {amount_2}

Total: {total_amount}

Payment can be made via bank transfer using the details below:
{branch_bank_transfer_info}

Please note that students may be barred from attending classes until the outstanding amount has been settled.

We appreciate your prompt attention to this matter.
Gaonhae Taekwondo ({branch})
```

- `{current_term_name}` = `getCurrentTerm(branchId) ?? getMostRecentTerm(branchId)` (same source as the existing SMS). Falls back to `"the current term"` if missing.
- `{days_overdue}` = whole days between `invoice.due_date` and today (`Math.max(1, …)`). Falls back to `"several"` if `due_date` is null.
- Items use en-dash separator and `formatCurrency`, dates DD/MM/YYYY via `@/utils/dateFormat`.
- `{branch_bank_transfer_info}` from `invoice_templates` matching the branch country (same lookup as existing SMS).

### Implementation

**1. `src/utils/invoicePDFGenerator.ts`** — add a sibling helper:

```ts
export const shareInvoiceOverdueReminderViaSMS = async (
  invoice: InvoiceData,
  phoneNumber: string,
  context?: { currentTerm?: SmsTermInfo | null; daysOverdue?: number | null }
): Promise<void>
```

Builds the overdue body using the template above and opens `sms:` URI. Reuses the existing `formatCurrency` helper, `SmsTermInfo` type, and number-cleaning regex. No PDF, no attachment.

**2. `src/components/dashboard/BranchDashboard.tsx`**

- Add a new handler `handleShareOverdueSMS(invoice)` that:
  - Resolves student phone (same fallback chain as `handleShareSMS`).
  - Fetches `fullInvoice`, branch country, active `invoice_template` (identical lookup).
  - Fetches current term: `getCurrentTerm(branch_id) ?? getMostRecentTerm(branch_id)`.
  - Computes `daysOverdue = Math.max(1, floor((today - due_date) / 86_400_000))` when `due_date` exists.
  - Calls `shareInvoiceOverdueReminderViaSMS(invoiceData, number, { currentTerm, daysOverdue })`.

- Render a new icon button next to the existing SMS button (line ~1405), guarded by an `isOverdue(invoice)` helper:

```tsx
{isOverdue(invoice) && (
  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600"
    title="Send overdue reminder"
    onClick={(e) => { e.stopPropagation(); handleShareOverdueSMS(invoice); }}>
    <AlertCircle className="w-3 h-3" />
  </Button>
)}
```

- `isOverdue` = `invoice.balance_due > 0 && invoice.due_date && new Date(invoice.due_date) < startOfToday() && !['cancelled','paid','verified'].includes(invoice.status)`.
- Add `AlertCircle` to the existing `lucide-react` import.

### Files affected

- `src/utils/invoicePDFGenerator.ts` — new `shareInvoiceOverdueReminderViaSMS` helper.
- `src/components/dashboard/BranchDashboard.tsx` — new `handleShareOverdueSMS`, conditional red `AlertCircle` button next to the existing blue SMS button, lucide import update.

### Verification

1. Branch Dashboard → Invoice & Payment.
2. An overdue unpaid/partial invoice shows three action icons: Download (grey), SMS (blue), **Overdue reminder (red `AlertCircle`)**, View, Edit, Delete.
3. A paid/verified/future-due invoice shows only the existing buttons (no red icon).
4. Clicking the red icon opens the device SMS app pre-filled with the template, correct days-overdue count, current term name, items + amounts, branch bank info, and signature line.
5. If `due_date` is null, body shows "several days overdue"; if no current term, body uses "the current term".
6. Existing blue SMS button, WhatsApp button, PDF download remain unchanged.

### Out of scope

- Surfacing on Sales > Invoice Management.
- Auto-send / scheduled reminders or bulk send.
- Recording reminder history / audit log.
- Changing WhatsApp message format.

