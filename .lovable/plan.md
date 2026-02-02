
# Update Invoice PDF According to Templates

## Overview
This plan updates the invoice PDF generator to:
1. Use template data (logo, letterhead, QR code, country) based on branch country
2. Add term information after class-related items (e.g., "1x Weekday")
3. Add grading slot information after belt-related items (e.g., "Green Tip >> Green")
4. Adjust text sizes: Increase "Balance Due" by 1pt, decrease "Total" by 1pt

---

## Current State Analysis

### Invoice Item Metadata
Invoice items store contextual info in the `metadata` JSONB field:
- **Classes**: `{ term_id: "uuid" }` - Links to `term_calendars` table
- **Grading**: `{ grading_slot_id: "uuid" }` - Links to `grading_slots` table

### Templates by Country
Templates are stored in `invoice_templates` with `country` field:
- Singapore template: `country = 'SG'`
- Australia template: `country = 'AU'`

Template contains: `logo_url`, `letterhead_url`, `paynow_qr_url`, `default_notes`

### Data Flow
1. Invoice has `branch_id`
2. Branch has `country` field (e.g., "Singapore", "Australia")
3. Template matches by country code

---

## Implementation Details

### 1. Update InvoiceData Interface
Add new fields to support template and item metadata:

```typescript
export interface InvoiceItem {
  // ... existing fields
  metadata?: {
    term_id?: string;
    grading_slot_id?: string;
  };
  term_info?: string;      // e.g., "Term 1 2026 (19 Jan - 10 Apr 2026)"
  grading_info?: string;   // e.g., "11 Apr 2026 at 08:40"
}

export interface InvoiceData {
  // ... existing fields
  template?: {
    logo_url?: string;
    letterhead_url?: string;
    paynow_qr_url?: string;
    country?: string;
  };
}
```

### 2. Update PDF Generator (`invoicePDFGenerator.ts`)

**Logo Changes:**
- Load logo from template `logo_url` instead of hardcoded path
- If template has `letterhead_url`, use it as full header background

**Item Description Enhancements:**
- After each item description, add a second line for:
  - Term info (gray, smaller text): "Term 1 2026 (19 Jan - 10 Apr)"
  - Grading info (gray, smaller text): "Grading: 11 Apr 2026 at 08:40"

**Text Size Adjustments:**
- "Total:" label: Change from 11pt to 10pt
- "Balance Due:" label: Keep at 10pt but make bold text larger (was implied 10pt, now 11pt)

**PayNow QR Code:**
- Add QR code image at bottom of PDF if `template.paynow_qr_url` exists
- Position above footer with label "Scan to Pay"

### 3. Update Data Preparation (`InvoiceManagementList.tsx`)

Update `prepareInvoiceDataForPDF()` to:
1. Fetch branch country from invoice's branch_id
2. Find matching template by country
3. Fetch term details for items with `term_id` in metadata
4. Fetch grading slot details for items with `grading_slot_id` in metadata
5. Format and attach additional info to each item

---

## PDF Layout with Changes

```text
+------------------------------------------+
|  [Logo from template.logo_url]           |
|  GAONHAE TAEKWONDO LLP                   |
|  [Country from branch]                   |
|  UEN: T24LL0001A                         |
|                              INVOICE     |
+------------------------------------------+
|  Invoice Number: INV-2026-00001          |
|  Status: paid                            |
|  Issue Date: 30 Jan 2026                 |
|  Due Date: 01 Mar 2026                   |
+------------------------------------------+
|  Bill To:                                |
|  Mingyu Song                             |
|  Address, Phone, Email                   |
+------------------------------------------+
|  Description       Qty   Price   Tax   Total |
|  --------------------------------------------|
|  Green Tip >> Green  1   $70.00  0.1%  $77.00 |
|    Grading: 11 Apr 2026 at 08:40             |  <-- NEW
|  1x Weekday         10   $25.00  0.1% $275.00 |
|    Term 1 2026 (19 Jan - 10 Apr)             |  <-- NEW
+------------------------------------------+
|                  Subtotal:      $320.00  |
|                  Tax:            $32.00  |
|                  --------------------    |
|                  Total:         $352.00  |  <-- 10pt (was 11)
|                  Amount Paid:   $352.00  |
|                  Balance Due:     $0.00  |  <-- 11pt (was 10)
+------------------------------------------+
|  [PayNow QR Code]   Scan to Pay          |  <-- NEW (if exists)
+------------------------------------------+
|  Notes: [from template.default_notes]    |
+------------------------------------------+
|  Thank you for your business!            |
+------------------------------------------+
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/utils/invoicePDFGenerator.ts` | Modify | Update interfaces, add template support, add term/grading info lines, adjust font sizes, add QR code |
| `src/components/sales/InvoiceManagementList.tsx` | Modify | Enhance `prepareInvoiceDataForPDF()` to fetch template, term, and grading data |

---

## Technical Notes

### Loading External Images
The PDF generator already has `loadCompanyLogo()` function. This will be refactored to a generic `loadImage(url)` function that works with any URL (including Supabase storage URLs).

### Term Info Format
- Format: `{term_name} ({start_date} - {end_date})`
- Example: "Term 1 2026 (19 Jan - 10 Apr)"

### Grading Info Format
- Format: `Grading: {date} at {time}`
- Example: "Grading: 11 Apr 2026 at 08:40"

### Font Size Reference
- Current "Total:" = 11pt bold
- New "Total:" = 10pt bold (reduced by 1)
- Current "Balance Due:" = 10pt bold
- New "Balance Due:" = 11pt bold (increased by 1)

