
# Fix Invoice Status and PDF Generation Issues

## Overview
This plan addresses two main issues:
1. **Invoice status not updating after payment deletion** - Status remains "Paid" even when payments are deleted
2. **PDF generation issues** - Wrong tax rate display and letterhead not loading for Australia invoices

---

## Issues Identified

### Issue 1: Payment Deletion Status Bug
| Location | Problem |
|----------|---------|
| `src/services/paymentService.ts` line 362 | Sets status to `'sent'` when balance is due after payment deletion |
| Impact | Invoice shows "Paid" even though no payments exist |
| Fix | Change `'sent'` to `'unpaid'` |

### Issue 2: Tax Rate Display Bug
| Location | Problem |
|----------|---------|
| `src/utils/invoicePDFGenerator.ts` line 240 | Displays `tax_rate` directly with `%` sign |
| Impact | Shows "0.1%" instead of "10%" for Australia invoices |
| Fix | Multiply by 100 for display: `(item.tax_rate * 100).toFixed(1)%` |

### Issue 3: Letterhead Not Loading (Investigation Needed)
| Symptom | PDF shows fallback text header instead of Australia letterhead |
| Possible Causes | CORS issues, URL not loading, or template not matched correctly |
| Data Check | Australia template URL exists: `letterhead-1770010766036.png` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/paymentService.ts` | Change status from `'sent'` to `'unpaid'` on payment deletion |
| `src/utils/invoicePDFGenerator.ts` | Fix tax rate display (multiply by 100), add debug logging for letterhead |

---

## Implementation Details

### 1. Fix Payment Deletion Status (paymentService.ts)

**Line 362 - Current code:**
```typescript
const newStatus = newBalanceDue > 0 ? 'sent' : 'paid';
```

**Change to:**
```typescript
const newStatus = newBalanceDue > 0 ? 'unpaid' : 'paid';
```

This ensures that when a payment is deleted and balance is due, the invoice correctly shows as "Unpaid".

---

### 2. Fix Tax Rate Display (invoicePDFGenerator.ts)

**Line 240 - Current code:**
```typescript
doc.text(`${item.tax_rate}%`, margin + colWidths.description + colWidths.qty + colWidths.price + 15, yPos, { align: 'right' });
```

**Change to:**
```typescript
const displayTaxRate = (item.tax_rate * 100).toFixed(1);
doc.text(`${displayTaxRate}%`, margin + colWidths.description + colWidths.qty + colWidths.price + 15, yPos, { align: 'right' });
```

This converts the decimal tax rate (0.1) to a percentage (10.0%) for proper display.

---

### 3. Debug Letterhead Loading

Add console logging to help diagnose why letterhead isn't loading:

**In the PDF generator, before the letterhead conditional:**
```typescript
console.log('PDF Generation - Template:', {
  letterhead_url: invoice.template?.letterhead_url,
  country: invoice.template?.country
});

const letterheadData = invoice.template?.letterhead_url 
  ? await loadImage(invoice.template.letterhead_url) 
  : null;

console.log('PDF Generation - Letterhead loaded:', !!letterheadData);
```

If the letterhead URL is correct but not loading, this may indicate a CORS or storage access issue.

---

## Data Fix Required

Mingyu's invoice (INV-2026-00001) needs a status correction:
- Current: `status = 'paid'`, `amount_paid = 352.00`, `balance_due = 0.00`
- After payment deletion: Should be `status = 'unpaid'`, `amount_paid = 0.00`, `balance_due = 352.00`

The database shows:
- No payments exist for this invoice (payments table query returned empty)
- But `amount_paid = 352.00` and `status = 'paid'`

This indicates the payment deletion didn't properly update the invoice. After fixing the code, you may need to manually correct this invoice's status and amounts in the database.

---

## Technical Summary

| Change | File | Line | Before | After |
|--------|------|------|--------|-------|
| Status on payment delete | `paymentService.ts` | 362 | `'sent'` | `'unpaid'` |
| Tax rate display | `invoicePDFGenerator.ts` | 240 | `item.tax_rate%` | `(item.tax_rate * 100).toFixed(1)%` |
| Debug logging | `invoicePDFGenerator.ts` | 102 | (none) | Add console.log for template data |

---

## Expected Outcome

After implementation:
1. Deleting a payment will correctly update invoice status to "Unpaid"
2. PDF invoices will display tax rates correctly (10% instead of 0.1%)
3. Console logs will help diagnose the letterhead loading issue

---

## Manual Database Fix for Mingyu's Invoice

Since the payment was already deleted without the fix, run this SQL to correct the invoice:

```sql
UPDATE invoices 
SET 
  amount_paid = 0,
  balance_due = total_amount,
  status = 'unpaid',
  updated_at = NOW()
WHERE id = '4359efa0-1a69-46e9-8e14-b53c51524750';
```
