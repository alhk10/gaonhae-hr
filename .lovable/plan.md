

# Add Bank Transfer Information Field

## Overview
Add a new "Bank Transfer Information" field to invoice templates that will be displayed above the PayNow QR code in generated invoice PDFs. This provides customers with direct bank transfer details as an alternative payment method.

---

## Changes Required

### 1. Database Migration
Add a new column `bank_transfer_info` to the `invoice_templates` table.

**New Column:**
- `bank_transfer_info` (text, nullable) - Multi-line text field for bank transfer details

### 2. Update Invoice Template List UI
Modify `src/components/sales/InvoiceTemplateList.tsx` to add a new form field for bank transfer information.

**Changes:**
- Add `bank_transfer_info` to the form data state
- Add a new Textarea field in the dialog form (placed after the PayNow QR Code section)
- Include the field in create/update operations

### 3. Update Invoice Template Service
Modify `src/services/invoiceTemplateService.ts` to handle the new field.

**Changes:**
- Add `bank_transfer_info` to the `InvoiceTemplate` interface
- Add `bank_transfer_info` to the `CreateTemplateData` interface
- Add `bank_transfer_info` to the `UpdateTemplateData` interface
- Include the field in create and update operations

### 4. Update Invoice PDF Generator
Modify `src/utils/invoicePDFGenerator.ts` to render bank transfer information above the PayNow QR code.

**Changes:**
- Add `bank_transfer_info` to the `InvoiceTemplate` interface
- In the PDF generation logic, render bank transfer information in a dedicated section positioned above the QR code
- Use clear formatting with a "Bank Transfer Details" header

---

## Visual Layout in PDF

```text
+--------------------------------------------------+
|  Notes:                          Bank Transfer:  |
|  Payment instructions...         Bank: XYZ Bank  |
|                                  Account: 123456 |
|                                  Swift: XYZABC   |
|                                                  |
|                                  [PayNow QR]     |
+--------------------------------------------------+
```

---

## Technical Details

### Database Migration
```sql
ALTER TABLE invoice_templates 
ADD COLUMN bank_transfer_info TEXT;
```

### TypeScript Interface Update
```typescript
interface InvoiceTemplate {
  // existing fields...
  bank_transfer_info?: string;  // NEW
}
```

### PDF Rendering Logic
The bank transfer information will be rendered:
1. Right-aligned in the notes/QR section
2. Above the PayNow QR code
3. Using 9pt font with a bold "Bank Transfer" header
4. Multi-line text support for account details

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration to add `bank_transfer_info` column |
| `src/integrations/supabase/types.ts` | Will auto-update after migration |
| `src/services/invoiceTemplateService.ts` | Add field to interfaces and operations |
| `src/components/sales/InvoiceTemplateList.tsx` | Add form field for bank transfer info |
| `src/utils/invoicePDFGenerator.ts` | Add `bank_transfer_info` to interface and render in PDF |

