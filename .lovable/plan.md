

# Change Invoice Template Fields and PDF Integration

## Overview
This change modifies the invoice template management to:
1. **Change Country Letterhead from file upload to text field** - Users will enter a URL manually instead of uploading
2. **Remove the Logo field entirely** - No longer needed
3. **Remove the Description field** - Simplify the template form
4. **Update PDF generation** - Ensure all fields work correctly with the new approach

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales/InvoiceTemplateList.tsx` | Remove logo upload UI, change letterhead to text input, remove description field |
| `src/utils/invoicePDFGenerator.ts` | Remove logo fallback logic since logo field is removed |
| `src/services/invoiceTemplateService.ts` | Update interfaces to make logo_url optional/unused |
| `src/components/sales/InvoiceManagementList.tsx` | Remove logo_url from template query |

---

## 1. InvoiceTemplateList.tsx Changes

### Remove from state and form:
- Remove `logo_url` from formData
- Remove `logoFileInputRef` ref
- Change `letterhead_url` from image upload to text input
- Remove `description` field entirely

### Remove from UploadType:
```text
Before: type UploadType = 'qr' | 'logo' | 'letterhead';
After:  type UploadType = 'qr';
```

### Remove logo upload UI section:
- Delete entire logo upload section (lines 414-464)
- Delete `logoFileInputRef` ref declaration
- Remove logo from `handleUploadImage` field mapping
- Remove logo from `handleRemoveImage` field mapping
- Remove logo icon indicator from table row

### Change letterhead section:
```text
Before: File upload with preview
After:  Simple text input for URL
```

### Remove description field:
- Delete the Description textarea section
- Remove from formData initialization
- Remove from handleOpenDialog
- Remove from handleSave

### Remove from table display:
- Remove Description column from templates table header
- Remove Description cell from table rows

---

## 2. PDF Generator Changes

### Update header rendering logic:
Since logo is being removed, simplify the fallback:

```text
Before:
- Try letterhead_url -> if exists, use it
- Else try logo_url -> if exists, draw logo + manual text
- Else draw only manual text

After:
- Try letterhead_url -> if exists, use it
- Else draw only manual text (no logo)
```

### Remove logo-related code:
- Remove `loadCompanyLogo` function
- Remove logo fallback in header section
- Simplify the else branch to just draw text

---

## 3. InvoiceManagementList.tsx Changes

### Update template query:
```text
Before: .select('logo_url, letterhead_url, paynow_qr_url, country')
After:  .select('letterhead_url, paynow_qr_url, country')
```

### Update template object construction:
```text
Before: 
template: {
  logo_url: template.logo_url || undefined,
  letterhead_url: template.letterhead_url || undefined,
  ...
}

After:
template: {
  letterhead_url: template.letterhead_url || undefined,
  ...
}
```

---

## 4. Service Layer Changes

### invoiceTemplateService.ts:
- Remove `logo_url` from save/update operations
- Keep in interface for backward compatibility (won't break existing data)

### invoicePDFGenerator.ts interface:
```text
Before:
export interface InvoiceTemplate {
  logo_url?: string;
  letterhead_url?: string;
  paynow_qr_url?: string;
  country?: string;
}

After:
export interface InvoiceTemplate {
  letterhead_url?: string;
  paynow_qr_url?: string;
  country?: string;
}
```

---

## 5. UI Changes Summary

### Create/Edit Template Dialog

**Before:**
```text
| Template Name *         |
| Description             |
| Country                 |
| [Logo Upload]           |
| [Letterhead Upload]     |
| [PayNow QR Upload]      |
| Default Notes           |
| Internal Notes          |
| Footer                  |
```

**After:**
```text
| Template Name *         |
| Country                 |
| Country Letterhead URL  | <-- Text input
| [PayNow QR Upload]      |
| Default Notes           |
| Internal Notes          |
| Footer                  |
```

### Templates Table

**Before:**
| Name | Description | Country | Status | Created | Actions |

**After:**
| Name | Country | Status | Created | Actions |

---

## 6. Database Notes

- The `logo_url` and `description` columns will remain in the database for backward compatibility
- Existing data will not be deleted from the database
- The UI simply stops using/displaying these fields
- Existing images in storage will remain (can be manually cleaned later if needed)

---

## 7. Implementation Order

1. Update `InvoiceTemplateList.tsx`:
   - Remove logo upload UI and refs
   - Change letterhead to text input
   - Remove description field
   - Update form state and handlers
   - Remove description column from table

2. Update `invoicePDFGenerator.ts`:
   - Remove logo_url from interface
   - Remove loadCompanyLogo function
   - Simplify header rendering to only use letterhead or text

3. Update `InvoiceManagementList.tsx`:
   - Remove logo_url from template query and mapping

4. Update `invoiceTemplateService.ts`:
   - Remove logo_url from create/update data interfaces

