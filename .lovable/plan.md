

# Plan: Enhance Letter Template Form

## Summary
This plan enhances the letter template dialog by adding:
1. Rich text editing (basic formatting) for body paragraphs
2. A second body paragraph field
3. Signature-related fields (Signature Image, Signatory Name, Position)
4. Removing the "Closing Statement" field

---

## Changes Overview

| Area | Change |
|------|--------|
| Database | Add 4 new columns: `body_text_2`, `signatory_name`, `signatory_position`, `signature_image_url` |
| Service | Update interfaces and CRUD operations for new fields |
| Dialog | Redesign form with 2 body paragraphs, rich text buttons, and signature fields |
| PDF Generator | Update to render Body Paragraph 2 and custom signature block |

---

## Technical Details

### 1. Database Schema Changes

Add new columns to `letter_templates` table:

```sql
ALTER TABLE letter_templates 
  ADD COLUMN body_text_2 TEXT DEFAULT '',
  ADD COLUMN signatory_name TEXT DEFAULT 'Gaonhae Taekwondo LLP',
  ADD COLUMN signatory_position TEXT DEFAULT '',
  ADD COLUMN signature_image_url TEXT DEFAULT '';
```

### 2. Update Letter Template Service

**File: `src/services/letterTemplateService.ts`**

Update the `LetterTemplate` interface:
```typescript
export interface LetterTemplate {
  id: string;
  name: string;
  type: 'student' | 'employee';
  title: string;
  body_text: string;
  body_text_2: string;       // NEW
  closing_text: string;       // Keep for backward compatibility, but not used in UI
  signatory_name: string;     // NEW
  signatory_position: string; // NEW
  signature_image_url: string;// NEW
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

Update `CreateLetterTemplateData` and `UpdateLetterTemplateData` interfaces accordingly.

### 3. Create Rich Text Textarea Component

**File: `src/components/ui/rich-textarea.tsx`**

A simple rich text component with basic formatting buttons (Bold, Italic, Underline) that wraps around a contentEditable div while maintaining plaintext output with basic markdown-like markers.

For simplicity in PDF generation, the component will:
- Provide formatting toolbar buttons
- Store content as plain text with basic markup markers like `**bold**`, `_italic_`, `__underline__`
- Display preview of formatted text

### 4. Redesign AddEditTemplateDialog

**File: `src/components/miscellaneous/AddEditTemplateDialog.tsx`**

Updated form layout:
```
┌─────────────────────────────────────────────┐
│ Template Name              │    Type        │
├─────────────────────────────────────────────┤
│ Available Placeholders: {fullName}, etc.    │
├─────────────────────────────────────────────┤
│ Letter Title *                              │
├─────────────────────────────────────────────┤
│ Body Paragraph 1 * (with formatting toolbar)│
│ [B] [I] [U]                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ Textarea content...                     │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Body Paragraph 2 (with formatting toolbar)  │
│ [B] [I] [U]                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ Textarea content...                     │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Signature Image (optional file upload)      │
├────────────────────┬────────────────────────┤
│ Signatory Name     │ Position               │
└────────────────────┴────────────────────────┘
```

Key changes:
- Remove "Closing Statement" field from UI
- Add "Body Paragraph 2" with same formatting toolbar
- Add simple formatting buttons (B, I, U) above each body textarea
- Add "Signature Image" file upload (optional)
- Add "Signatory Name" input (defaults to "Gaonhae Taekwondo LLP")
- Add "Signatory Position" input

### 5. Update PDF Generator

**File: `src/utils/verificationLetterPDFGenerator.ts`**

Update `LetterTemplateData` interface:
```typescript
export interface LetterTemplateData {
  id: string;
  name: string;
  type: 'student' | 'employee';
  title: string;
  body_text: string;
  body_text_2?: string;
  signatory_name?: string;
  signatory_position?: string;
  signature_image_url?: string;
}
```

Update PDF generation logic:
1. Render Body Paragraph 1
2. Render Body Paragraph 2 (if present)
3. Skip closing statement rendering
4. Add signature image (if provided)
5. Use custom signatory name and position instead of hardcoded "Gaonhae Taekwondo LLP"

Updated sign-off section:
```
Yours faithfully,

[Signature Image - if provided]

{Signatory Name}
{Signatory Position}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | CREATE (add new columns) |
| `src/services/letterTemplateService.ts` | MODIFY (update interfaces) |
| `src/components/ui/rich-textarea.tsx` | CREATE (new formatting component) |
| `src/components/miscellaneous/AddEditTemplateDialog.tsx` | MODIFY (new form layout) |
| `src/utils/verificationLetterPDFGenerator.ts` | MODIFY (update PDF rendering) |

---

## Rich Text Formatting Approach

Since jsPDF has limited support for rich text, the formatting will use a simple approach:

1. **In the Editor**: Use toolbar buttons that wrap selected text with markers:
   - Bold: `**text**`
   - Italic: `_text_`
   - Underline: `__text__`

2. **In the PDF**: Parse these markers and apply appropriate `doc.setFont()` styling:
   - `**text**` → `doc.setFont('helvetica', 'bold')`
   - `_text_` → `doc.setFont('helvetica', 'italic')`
   - `__text__` → Draw underline via `doc.line()`

This keeps the data storage simple (plain text) while providing basic formatting support.

---

## Implementation Order

1. Run database migration to add new columns
2. Update `letterTemplateService.ts` with new fields
3. Create `rich-textarea.tsx` component
4. Update `AddEditTemplateDialog.tsx` with new form design
5. Update `verificationLetterPDFGenerator.ts` for new fields
6. Test the complete flow

