## Plan: Render discount line + Subtotal in single-child reminder message

### Problem

When a student has no siblings (single-invoice send), the SMS / WhatsApp reminder does not show the discount line, even though the same `buildItemAndDiscountLines` helper is used for the combined sibling message and renders it correctly there.

Two issues compound:

1. **Visual ambiguity** — the single-child template (line 644–653 in `src/utils/invoicePDFGenerator.ts`) ends with `Total: ${formatCurrency(invoice.total_amount)}`. Because `invoice.total_amount` is already the *net* amount (after discount), if a discount line is rendered between the item and the Total, the math reads transparently (`$250 − $20 = $230 Total`) but there is no `Subtotal:` label like the combined template uses. Users glancing at the message can miss that the discount actually applied — or interpret the absence of a `Subtotal` line as the discount not being included.

2. **Mismatch between single-invoice and combined-invoice templates** — the combined message uses `Subtotal: ${balance_due}` per block, while the single-child message uses `Total: ${total_amount}`. Inconsistent labels, and `total_amount` ignores partial payments while `balance_due` reflects what's actually owed.

### Fix

Update the single-child template in `buildTermReminderMessage` (`src/utils/invoicePDFGenerator.ts`, lines 634–654) so it mirrors the combined layout:

**Before**
```
{itemsList}

Total: {total_amount}
```

**After**
```
{itemsList}
Subtotal: {balance_due}
```

Specifically:

1. Replace `Total: ${formatCurrency(invoice.total_amount)}` with `Subtotal: ${formatCurrency(invoice.balance_due)}`, placed immediately after `itemsList` (no blank line between items and Subtotal — matches combined format).
2. Keep `buildItemAndDiscountLines(invoice)` exactly as-is — it already handles `metadata.line_discount`, negative-amount line items, and header `discount_amount`.
3. No changes to `buildCombinedReminderMessage`, `shareInvoiceViaSMS`, `shareInvoiceViaWhatsApp`, or `BranchDashboard.tsx`.

Resulting single-child output (e.g., a lone student with a sibling discount on `Once a Week`):

```
Good Morning,

We have now reached the end of Term 1 2026. Term 2 2026 will commence in 4 days and will run from 28/04/2026 to 03/07/2026.

Kindly arrange payment for ELI GIAM before the start of the term as follows:

Once a Week – $250.00
Discount: -$20.00
National Athlete License – $35.00
South West Open – $70.00
Subtotal: $335.00

Payment can be made via bank transfer using the details below:
{branch bank info}

Thank you for your continued support.
Gaonhae Taekwondo {branch}
```

### Files affected

- `src/utils/invoicePDFGenerator.ts` — `buildTermReminderMessage` only.

No DB changes, no service changes, no UI changes.

### Verification

1. **Single child with line discount** — click SMS on an invoice that has `metadata.line_discount` (e.g., `Once a Week` $250 with $20 sibling discount) for a student with no siblings: message shows the item at $250, `Discount: -$20.00` directly underneath, then `Subtotal: $230.00`.
2. **Single child with negative-amount line item** (e.g., bundle discount): the negative item still renders as `{description}: -$10.00`, then `Subtotal: …`.
3. **Single child with header `discount_amount`** only: shows `Discount: -{amount}` line, then `Subtotal: …`.
4. **Single child with no discounts at all**: shows items, then `Subtotal: {balance_due}` — no spurious discount line.
5. **Partial payment present** (`balance_due < total_amount`): Subtotal correctly reflects `balance_due`, matching the combined-template behaviour.
6. **Combined sibling message**: unchanged — still per-block `Subtotal` + `Grand Total` at end.
7. **WhatsApp button** on single child: identical body opens via WhatsApp.
8. **Overdue reminder** (`shareInvoiceOverdueReminderViaSMS`): unchanged — uses its own template.

### Out of scope

- Changing the combined-message format.
- Updating `InvoiceManagementList.tsx` (Sales module) which uses the same helper — it will automatically benefit.
- Changing the PDF invoice body.
- Overdue reminder template.
