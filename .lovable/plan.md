

# Fix Invoice Tax Calculation and Payment Deletion Status

## Overview
This plan addresses two critical issues:
1. **Invoice status not updating after payment deletion** - The database shows status is still "Paid" even with 0 payments
2. **Tax-inclusive calculations not applied** - Australia (Morley) branch invoices should show tax-inclusive pricing, but they currently show tax-exclusive

---

## Issue 1: Payment Deletion Status Bug

### Problem
Mingyu's invoice (INV-2026-00001) shows:
- Status: "Paid"
- Payments: 0
- Paid: $352.00
- Balance Due: $0.00

The payment was deleted, but the invoice amounts and status were not updated.

### Root Cause
The code fix (`'sent'` to `'unpaid'`) was applied in the previous change, but:
1. Mingyu's invoice was affected **before** the fix was deployed
2. The `deletePayment` function doesn't verify the update succeeded

### Solution
1. Add error handling to verify invoice update succeeds
2. Recalculate invoice amounts based on actual payments (safety recalculation)
3. Manual database fix for Mingyu's invoice

### Files to Modify

**`src/services/paymentService.ts`**
- Add verification that invoice update succeeded
- Add fallback recalculation using actual payments in database

```text
Current flow:
1. Fetch payment details
2. Delete payment from database
3. Calculate new amounts (using old invoice values - payment amount)
4. Update invoice (no error checking)

Fixed flow:
1. Fetch payment details
2. Delete payment from database
3. Query actual remaining payments for invoice
4. Sum payment amounts to get accurate amount_paid
5. Calculate balance_due and status based on actual data
6. Update invoice with error checking
7. Throw error if update fails
```

---

## Issue 2: Tax-Inclusive Calculation Bug

### Problem
Ethan and Mingyu are Morley (Australia) students. Their invoices should use tax-inclusive pricing (price includes GST), but they're showing tax-exclusive calculations.

### Current Behavior
Looking at Mingyu's invoice items:
| Description | Unit Price | Tax | Total |
|-------------|-----------|-----|-------|
| Green Tip >> Green | $70.00 | $7.00 | $77.00 |
| 1x Weekday | $25.00 | $25.00 | $275.00 |

Tax is being **added on top** (exclusive), but Australia should have tax **included** in price.

### Expected Behavior (Tax-Inclusive)
For tax-inclusive, if price is $70.00 with 10% GST:
- Total = $70.00 (as entered)
- Subtotal (pre-tax) = $70.00 / 1.10 = $63.64
- Tax = $70.00 - $63.64 = $6.36

### Root Cause
The `createInvoice` function in `invoiceService.ts` always uses tax-exclusive calculation:
```typescript
// Current (wrong for Australia):
const itemTotal = item.quantity * item.unit_price;
subtotal += itemTotal;
taxAmount += itemTotal * taxRate;  // Always adds tax on top
```

The `CreateInvoiceDialog` has correct calculation logic but doesn't pass the `isInclusive` flag to the service.

### Solution
Update `invoiceService.ts` to:
1. Fetch branch's tax_included setting
2. Apply correct calculation based on inclusive vs exclusive
3. Store the calculated values correctly

### Files to Modify

**`src/services/invoiceService.ts`**
- Import `COUNTRY_TAX_INCLUDED` and `DEFAULT_TAX_INCLUDED` from constants
- Add helper function to get tax inclusion setting
- Update `createInvoice` to handle both tax-inclusive and tax-exclusive calculations

```text
New logic in createInvoice:

// Get tax configuration
const taxRate = getTaxRateForCountry(branchCountry);
const isInclusive = getIsTaxIncludedForCountry(branchCountry);

// Calculate item totals
for (const item of invoiceData.items) {
  const itemPrice = item.quantity * item.unit_price;
  
  if (isInclusive) {
    // Tax-inclusive (Australia): price already includes tax
    const itemSubtotal = itemPrice / (1 + taxRate);
    const itemTax = itemPrice - itemSubtotal;
    subtotal += itemSubtotal;
    taxAmount += itemTax;
    // Store original price as total
  } else {
    // Tax-exclusive (Singapore): add tax on top
    subtotal += itemPrice;
    taxAmount += itemPrice * taxRate;
  }
}

const totalAmount = isInclusive ? (subtotal + taxAmount) : (subtotal + taxAmount);
```

Also update invoice items insertion to store correct values per item.

---

## Implementation Details

### File 1: `src/services/paymentService.ts`

#### Change 1: Improve deletePayment reliability (lines 352-373)

Replace the invoice update logic with:

```typescript
// Update invoice balance - recalculate from actual payments
const { data: remainingPayments } = await supabase
  .from('payments')
  .select('amount')
  .eq('invoice_id', payment.invoice_id);

const actualAmountPaid = (remainingPayments || []).reduce(
  (sum, p) => sum + Number(p.amount), 0
);

const { data: invoice, error: invoiceError } = await supabase
  .from('invoices')
  .select('total_amount')
  .eq('id', payment.invoice_id)
  .single();

if (invoice && !invoiceError) {
  const newBalanceDue = invoice.total_amount - actualAmountPaid;
  const newStatus = newBalanceDue > 0 ? 'unpaid' : 'paid';

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      amount_paid: actualAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', payment.invoice_id);

  if (updateError) {
    logger.error('Failed to update invoice after payment deletion', updateError);
    throw new Error(`Failed to update invoice: ${updateError.message}`);
  }
}
```

---

### File 2: `src/services/invoiceService.ts`

#### Change 1: Add tax inclusion helper (after line 16)

```typescript
import { COUNTRY_TAX_INCLUDED, DEFAULT_TAX_INCLUDED } from '@/config/constants';

const getIsTaxIncludedForCountry = (country: string | null): boolean => {
  return country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED;
};
```

#### Change 2: Update createInvoice calculation (lines 228-252)

Replace the calculation logic with:

```typescript
// Get branch country for tax rate and inclusion
let branchCountry: string | null = null;
if (invoiceData.branch_id) {
  const { data: branch } = await supabase
    .from('branches')
    .select('country')
    .eq('id', invoiceData.branch_id)
    .single();
  branchCountry = branch?.country || null;
}

const taxRate = getTaxRateForCountry(branchCountry);
const isTaxIncluded = getIsTaxIncludedForCountry(branchCountry);

// Calculate totals based on tax inclusion setting
let subtotal = 0;
let taxAmount = 0;

for (const item of invoiceData.items) {
  const itemPrice = item.quantity * item.unit_price;
  
  if (isTaxIncluded) {
    // Tax-inclusive (e.g., Australia): price already includes tax
    const itemSubtotal = itemPrice / (1 + taxRate);
    const itemTax = itemPrice - itemSubtotal;
    subtotal += itemSubtotal;
    taxAmount += itemTax;
  } else {
    // Tax-exclusive (e.g., Singapore): add tax on top
    subtotal += itemPrice;
    taxAmount += itemPrice * taxRate;
  }
}

const totalAmount = subtotal + taxAmount;
const balanceDue = totalAmount;
```

#### Change 3: Update invoice items insertion (lines 290-306)

Update to handle tax inclusion:

```typescript
const itemsToInsert = invoiceData.items.map(item => {
  const itemPrice = item.quantity * item.unit_price;
  
  let itemSubtotal: number;
  let itemTaxAmount: number;
  let itemTotal: number;
  
  if (isTaxIncluded) {
    // Tax-inclusive: price is the total, calculate backwards
    itemTotal = itemPrice;
    itemSubtotal = itemPrice / (1 + taxRate);
    itemTaxAmount = itemPrice - itemSubtotal;
  } else {
    // Tax-exclusive: add tax on top
    itemSubtotal = itemPrice;
    itemTaxAmount = itemPrice * taxRate;
    itemTotal = itemSubtotal + itemTaxAmount;
  }
  
  return {
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: taxRate,
    tax_amount: itemTaxAmount,
    total_amount: itemTotal,
    size_variant: item.size_variant,
    metadata: item.metadata
  };
});
```

---

## Database Fix for Mingyu's Invoice

Run this SQL to correct the current data:

```sql
UPDATE invoices 
SET 
  amount_paid = 0,
  balance_due = total_amount,
  status = 'unpaid',
  updated_at = NOW()
WHERE id = '4359efa0-1a69-46e9-8e14-b53c51524750';
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/services/paymentService.ts` | Recalculate invoice amounts from actual payments, add update verification |
| `src/services/invoiceService.ts` | Add tax-inclusion logic for Australia branches |

## Expected Outcome

1. **Future payment deletions**: Will correctly update invoice status, amount_paid, and balance_due
2. **New Australia invoices**: Will use tax-inclusive calculations (price includes GST)
3. **Mingyu's invoice**: Will show correct "Unpaid" status after manual database fix

