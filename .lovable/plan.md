## Plan: Render per-line discounts in SMS/WhatsApp reminder messages

### Problem

In Eli's reminder, "Once a Week" is shown at $230 (the *net* price) and the $20 sibling discount disappears entirely. The expected output is:

```
Once a Week – $250.00
National Athlete License – $35.00
South West Open – $70.00
Discount: -$20.00
Subtotal: $335.00
```

### Root cause

`buildItemAndDiscountLines` in `src/utils/invoicePDFGenerator.ts` only detects discounts in two ways:
1. **Negative line items** (`total_amount < 0`) — none exist here.
2. **Header `invoice.discount_amount > 0`** — also zero for this invoice.

The actual discount lives **inside each item's metadata** as `metadata.line_discount = { discount_type: 'amount', discount_value: 20 }` (older rows) or `{ type, value }` (newer rows, written by `InvoiceDialog.tsx` line 1192). The item's stored `total_amount` is **already net** of that discount (`unit_price × quantity − discount`). DB confirms: `unit_price=25, quantity=10, total_amount=230` → gross $250, discount $20, net $230. So the discount is invisible in the message.

### Fix

Update `buildItemAndDiscountLines` to handle line-level discounts:

1. For each positive line item, read `metadata.line_discount` and normalise both shapes:
   ```ts
   const ld = item.metadata?.line_discount;
   const dType = ld?.type ?? ld?.discount_type;          // 'amount' | 'percentage'
   const dValue = Number(ld?.value ?? ld?.discount_value ?? 0);
   ```
2. If `dValue > 0`, render the item line at **gross** (`quantity × unit_price`) instead of `total_amount`, and emit a separate discount line directly under it:
   ```
   Once a Week – $250.00
   Discount: -$20.00
   ```
   - `discount_type === 'amount'` → discount amount = `dValue`.
   - `discount_type === 'percentage'` → discount amount = `gross × dValue / 100`.
3. If `dValue` is 0/missing → keep current behaviour (render `total_amount`, no discount line).
4. Existing **negative-amount line items** and **header `invoice.discount_amount`** logic stays unchanged (used by manual discounts and bundle discounts that are written as a separate negative item).
5. The per-invoice `Subtotal: ${balance_due}` and the message-level `Grand Total` are untouched — they are already correct because `balance_due` reflects the net amount.

### Extend `InvoiceItem` type

In `src/utils/invoicePDFGenerator.ts`, widen the optional `metadata` shape so TypeScript accepts `line_discount`:

```ts
metadata?: {
  term_id?: string;
  grading_slot_id?: string;
  line_discount?: {
    type?: 'amount' | 'percentage';
    value?: number;
    discount_type?: 'amount' | 'percentage'; // legacy
    discount_value?: number;                  // legacy
  };
};
```

No DB changes. No edge-function changes. No component-API changes — `BranchDashboard.tsx` already maps `metadata` through to `InvoiceData.items[].metadata` (line 399), so the helper will receive what it needs without any further plumbing.

### Files affected

- `src/utils/invoicePDFGenerator.ts` — extend `InvoiceItem.metadata` type; update `buildItemAndDiscountLines` only.

Both `buildTermReminderMessage` (single-invoice path, used by Branch Dashboard and `InvoiceManagementList.tsx` Sales module) and `buildCombinedReminderMessage` (sibling-merge path) call `buildItemAndDiscountLines`, so the fix flows through both automatically.

### Verification

1. **Eli (INV-2026-00274)** — click SMS / WhatsApp on Leah Giam's invoice (which merges Eli + Phoebe + Leah Giam). Eli's block reads:
   ```
   ELI GIAM — Invoice INV-2026-00274
   Once a Week – $250.00
   Discount: -$20.00
   National Athlete License – $35.00
   South West Open – $70.00
   Subtotal: $335.00
   ```
2. **Leah Giam (INV-2026-00282)** and **Phoebe (INV-2026-00287)**:
   ```
   Once a Week – $250.00
   Discount: -$20.00
   Subtotal: $230.00
   ```
3. **Grand Total** = $335 + $230 + $230 = **$795.00**.
4. Invoice with no `line_discount` and no header discount → renders exactly as today (no spurious discount line).
5. Invoice with a manual header `discount_amount` → still shows the existing `Discount: -$X` line under items.
6. Invoice with a negative-amount line item (e.g., automatic bundle $10 discount) → still shows that line verbatim.
7. Invoice using percentage discount (`discount_type: 'percentage', discount_value: 10`) → gross calculated from `quantity × unit_price`, discount amount = `gross × 10 / 100`.
8. Single-invoice send (no siblings) via `buildTermReminderMessage` → same per-line discount rendering applied.

### Out of scope

- Changing the PDF invoice body (separate template).
- Cross-branch sibling merging.
- Matching siblings by phone/WhatsApp number.
- Updating the overdue-reminder SMS template.
