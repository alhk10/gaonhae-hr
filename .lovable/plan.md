
# Invoice Template Enhancements Plan

## Overview
This plan modifies the Invoice Template creation/edit dialog to:
1. **Add PayNow QR Code Upload** - Allow uploading a QR code image for customers to scan and pay
2. **Add Country field** - Add a country selector for regional invoice settings
3. **Remove Payment Terms** - Remove the payment terms field from the UI

---

## 1. Database Changes

### New Columns for `invoice_templates` Table
| Column | Type | Description |
|--------|------|-------------|
| `paynow_qr_url` | TEXT | URL to the uploaded PayNow QR code image |
| `country` | TEXT | Country code (e.g., 'SG', 'AU') |

### Storage Bucket
Create a new storage bucket `invoice-qr-codes` for storing PayNow QR code images.

---

## 2. File Changes

### Database Migration
**New file:** `supabase/migrations/[timestamp]_add_template_paynow_qr.sql`
- Add `paynow_qr_url` column to `invoice_templates`
- Add `country` column to `invoice_templates`
- Create `invoice-qr-codes` storage bucket with appropriate RLS policies

### Service Layer Updates
**File:** `src/services/invoiceTemplateService.ts`
- Update `InvoiceTemplate` interface to include `paynow_qr_url` and `country`
- Update `CreateTemplateData` and `UpdateTemplateData` interfaces

### Component Updates
**File:** `src/components/sales/InvoiceTemplateList.tsx`

**Remove:**
- Payment Terms input field
- Payment Terms column from the table

**Add:**
- Country dropdown (Singapore, Australia options)
- PayNow QR Code upload section with:
  - Hidden file input
  - Upload button
  - Preview of uploaded QR code
  - Remove button for existing QR

**Form State Changes:**
```text
Current:
- name
- description
- default_payment_terms_days  <-- REMOVE
- default_notes
- default_internal_notes

New:
- name
- description
- country                     <-- ADD
- paynow_qr_url              <-- ADD (file upload)
- default_notes
- default_internal_notes
```

---

## 3. Implementation Details

### Country Dropdown Options
| Value | Label |
|-------|-------|
| SG | Singapore |
| AU | Australia |

### QR Code Upload Flow
```text
User clicks "Upload QR Code"
        |
        v
File picker opens (accept: image/*)
        |
        v
Selected file uploaded to 'invoice-qr-codes' bucket
        |
        v
Public URL stored in paynow_qr_url
        |
        v
Preview displayed in form
```

### UI Layout (Dialog)
```text
+------------------------------------------+
| Create Template                          |
| Create a new invoice template...         |
+------------------------------------------+
|                                          |
| Template Name *                          |
| [________________________]               |
|                                          |
| Description                              |
| [________________________]               |
|                                          |
| Country                                  |
| [Singapore          ▼]                   |
|                                          |
| PayNow QR Code                           |
| [Upload QR Code]  or  [QR Preview] [X]   |
|                                          |
| Default Notes (visible to customer)      |
| [________________________]               |
|                                          |
| Default Internal Notes                   |
| [________________________]               |
|                                          |
|              [Cancel]  [Create Template] |
+------------------------------------------+
```

### Table Columns (After)
| Name | Description | Country | Status | Created | Actions |
|------|-------------|---------|--------|---------|---------|

---

## 4. Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | Create | Add paynow_qr_url, country columns and storage bucket |
| `src/integrations/supabase/types.ts` | Auto-update | New column types |
| `src/services/invoiceTemplateService.ts` | Modify | Update interfaces |
| `src/components/sales/InvoiceTemplateList.tsx` | Modify | Remove payment terms, add country dropdown and QR upload |

---

## 5. Technical Considerations

### Backward Compatibility
- The `default_payment_terms_days` column remains in the database
- Only the UI input is removed
- Existing templates retain their payment terms values

### File Upload Security
- QR codes uploaded to dedicated storage bucket
- RLS policies ensure only superadmins can upload/delete
- Public read access for displaying on invoices

### Invoice PDF Integration
- The uploaded QR code can later be added to invoice PDFs
- This enhancement focuses on template storage only
