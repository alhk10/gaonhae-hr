
# Plan: Update Invoice PDF Layout - QR Code and Footer Changes

## Summary

Update the invoice PDF generator to:
1. Remove the "Scan to Pay" header text
2. Move the QR code to the right side
3. Increase QR code size by 5% (from 40x40 to 42x42)
4. Display template default notes on the left (next to QR code)
5. Use template footer text instead of hardcoded "Thank you for your business!"

---

## Current Layout

```text
┌─────────────────────────────────────────────────┐
│ [Invoice Header, Items, Totals, etc.]           │
├─────────────────────────────────────────────────┤
│ Scan to Pay        ← To be removed              │
│ ┌────────┐                                      │
│ │ QR     │                                      │
│ │ Code   │         ← Currently on LEFT          │
│ └────────┘                                      │
├─────────────────────────────────────────────────┤
│ Notes: [invoice notes]                          │
├─────────────────────────────────────────────────┤
│       Thank you for your business!   ← Hardcoded│
│       Generated on 01 Feb 2026 10:30            │
└─────────────────────────────────────────────────┘
```

## New Layout

```text
┌─────────────────────────────────────────────────┐
│ [Invoice Header, Items, Totals, etc.]           │
├─────────────────────────────────────────────────┤
│ Notes:                          ┌────────────┐  │
│ [Template default notes]        │   QR       │  │
│                                 │   Code     │  │
│                                 │   (42x42)  │  │
│ [Invoice-specific notes]        └────────────┘  │
│                                     ↑ RIGHT     │
├─────────────────────────────────────────────────┤
│       [Template footer_text]    ← From template │
│       Generated on 01 Feb 2026 10:30            │
└─────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update Template Data Query

**File: `src/components/sales/InvoiceManagementList.tsx`**

Update the template query (around line 244-249) to include `default_notes` and `footer_text`:

```sql
SELECT letterhead_url, paynow_qr_url, country, default_notes, footer_text
FROM invoice_templates
WHERE country = :countryCode AND is_active = true
LIMIT 1
```

Also update the template object being passed to include these new fields.

### Step 2: Update InvoiceTemplate Interface

**File: `src/utils/invoicePDFGenerator.ts`**

Add `default_notes` and `footer_text` to the `InvoiceTemplate` interface:

```typescript
export interface InvoiceTemplate {
  letterhead_url?: string;
  paynow_qr_url?: string;
  country?: string;
  default_notes?: string;  // NEW
  footer_text?: string;    // NEW
}
```

### Step 3: Update PDF Generation Logic

**File: `src/utils/invoicePDFGenerator.ts`**

Changes to the PayNow QR section (lines 354-373):

| Change | Details |
|--------|---------|
| Remove "Scan to Pay" header | Delete lines 364-367 |
| Move QR code to right side | Position: `pageWidth - margin - qrSize` instead of `margin` |
| Increase QR size by 5% | Change from 40x40 to 42x42 |
| Add default notes on left | Render `template.default_notes` at left margin, same Y position as QR |

### Step 4: Update Footer Section

**File: `src/utils/invoicePDFGenerator.ts`**

Change the footer (lines 396-401):

| Current | New |
|---------|-----|
| `"Thank you for your business!"` (hardcoded) | `template.footer_text` or fallback to hardcoded text |

---

## Technical Details

### QR Code Positioning

```typescript
// Current (left-aligned)
doc.addImage(qrData.data, 'PNG', margin, yPos, 40, 40);

// New (right-aligned, 5% larger)
const qrSize = 42; // 40 * 1.05 = 42
const qrX = pageWidth - margin - qrSize;
doc.addImage(qrData.data, 'PNG', qrX, yPos, qrSize, qrSize);
```

### Notes Layout (Left of QR)

The default notes will be rendered in a column to the left of the QR code:
- Max width: `pageWidth - margin * 2 - qrSize - 10` (leaving 10pt gap)
- Position: Left margin
- Font: 9pt normal

### Footer Text Logic

```typescript
// Get footer text from template or use fallback
const footerText = invoice.template?.footer_text?.trim() 
  || 'Thank you for your business!';
doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales/InvoiceManagementList.tsx` | Add `default_notes`, `footer_text` to template query and data |
| `src/utils/invoicePDFGenerator.ts` | Update interface, QR positioning, notes layout, footer text |

---

## Visual Summary

Before:
- "Scan to Pay" header above QR
- QR code on left (40x40)
- Hardcoded "Thank you for your business!"

After:
- No header above QR
- QR code on right (42x42)
- Template default notes on left
- Template footer text (with fallback)
