
# Plan: Convert Country Letterhead from URL to Long Text Field

## Summary

Convert the Country Letterhead field from a URL input (for image loading) to a multi-line text field that stores and displays company information directly in the invoice PDF.

---

## Current Behavior

- The `letterhead_url` field stores an image URL
- The PDF generator attempts to load this URL as an image
- If the image fails to load, it falls back to hardcoded text

## New Behavior

- The field becomes a multi-line text area for entering formatted company information
- The PDF generator will render this text directly in the header
- Singapore templates will default to:
  ```
  GAONHAE TAEKWONDO | T18LL1687K
  271 Bukit Timah Road #02-08 Singapore 259708
  www.gaonhaetaekwondo.com | gaonhaetaekwondo@gmail.com
  ```

---

## Implementation Steps

### Step 1: Update Invoice Template List UI

**File: `src/components/sales/InvoiceTemplateList.tsx`**

Changes:
1. Rename label from "Country Letterhead URL" to "Country Letterhead"
2. Change the `<Input>` element to `<Textarea>` with multiple rows
3. Update placeholder text to show example format
4. When country is "SG" and field is empty, auto-fill with default Singapore letterhead text

### Step 2: Update PDF Generator

**File: `src/utils/invoicePDFGenerator.ts`**

Changes:
1. Modify the letterhead logic to treat `letterhead_url` as plain text instead of an image URL
2. Render each line of the letterhead text at the top-left of the PDF
3. Keep proper spacing and formatting for multi-line text
4. Remove the image loading attempt for letterhead (keep the fallback text logic as backup)

---

## Technical Details

### UI Changes (InvoiceTemplateList.tsx)

```
Current (line 360-369):
┌─────────────────────────────────────────┐
│ Country Letterhead URL                  │
│ ┌─────────────────────────────────────┐ │
│ │ https://example.com/letterhead.png  │ │ ← Single-line Input
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

New:
┌─────────────────────────────────────────┐
│ Country Letterhead                      │
│ ┌─────────────────────────────────────┐ │
│ │ GAONHAE TAEKWONDO | T18LL1687K     │ │ ← Multi-line Textarea
│ │ 271 Bukit Timah Road...             │ │
│ │ www.gaonhaetaekwondo.com | ...      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### PDF Rendering Changes (invoicePDFGenerator.ts)

The PDF header will render the letterhead text with:
- Font size: 9pt for consistent, compact display
- Line spacing: 5pt between lines
- Position: Top-left aligned starting at margin
- Format: Split by newlines and render each line sequentially

### Default Text for Singapore

```text
GAONHAE TAEKWONDO | T18LL1687K
271 Bukit Timah Road #02-08 Singapore 259708
www.gaonhaetaekwondo.com | gaonhaetaekwondo@gmail.com
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales/InvoiceTemplateList.tsx` | Change Input to Textarea, update label, add default for SG |
| `src/utils/invoicePDFGenerator.ts` | Render letterhead as text instead of image |

---

## Database Considerations

No database schema changes required - the `letterhead_url` column is already of type `text` which can store multi-line content. Existing data (if any URLs) will still work since the PDF generator will have fallback logic.

---

## Backward Compatibility

- Existing templates with image URLs will show the raw URL text in the PDF header (which is acceptable since they'll need to be updated to the new format)
- The PDF fallback logic for empty/invalid letterhead will continue to work
- Templates can be gradually updated by superadmins to use the new text format
