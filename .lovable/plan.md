

# Revised Plan: Add Addressee, Address, Salutation, Contact Fields and Enhance PDF Generator

## Summary
Add new letter template fields (Addressee Name, Address, Salutation, Contact Number), update default footer text, and implement dynamic content fitting in the PDF generator. Address and Contact Number will default to employee details when generating letters.

---

## Changes Overview

| Area | Change |
|------|--------|
| Database | Add 4 new columns: `addressee_name`, `address`, `salutation`, `contact_number` |
| Service | Update interfaces and CRUD operations for new fields |
| Dialog | Add fields in order: Addressee Name → Address → Contact Number → Salutation → Letter Title |
| Dialog | Set default footer text to "This letter is computer generated and does not require signature" |
| PDF Generator | Add new fields rendering, use template footer, implement dynamic content fitting |
| PDF Generator | Populate Address and Contact Number from employee details when generating |

---

## Field Order in Form (Top to Bottom)

1. Template Name / Type (existing - row)
2. Available Placeholders (existing)
3. **Addressee Name** (NEW - Optional, default: `{fullName}`)
4. **Address** (NEW - Optional, multiline textarea, default: extract from employee)
5. **Contact Number** (NEW - Optional, default: extract from employee)
6. **Salutation** (NEW - Optional, default: "To Whom It May Concern")
7. Letter Title (existing)
8. Body Paragraph 1 (existing)
9. Body Paragraph 2 (existing)
10. Signature Image (existing)
11. Signatory Name / Position (existing - row)
12. Company Name (existing)
13. Footer Text (existing - default changed to "This letter is computer generated and does not require signature")

---

## Technical Details

### 1. Database Schema Changes

Add new columns to `letter_templates` table:

```sql
ALTER TABLE public.letter_templates 
  ADD COLUMN IF NOT EXISTS addressee_name text DEFAULT '{fullName}',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS salutation text DEFAULT 'To Whom It May Concern';
```

### 2. Update Letter Template Service

**File:** `src/services/letterTemplateService.ts`

Add to interfaces:
```typescript
// LetterTemplate interface
addressee_name: string;
address: string;
contact_number: string;
salutation: string;

// CreateLetterTemplateData interface
addressee_name?: string;
address?: string;
contact_number?: string;
salutation?: string;

// UpdateLetterTemplateData interface
addressee_name?: string;
address?: string;
contact_number?: string;
salutation?: string;
```

Update `createTemplate` default values:
```typescript
addressee_name: templateData.addressee_name || '{fullName}',
address: templateData.address || '',
contact_number: templateData.contact_number || '',
salutation: templateData.salutation || 'To Whom It May Concern',
```

### 3. Update AddEditTemplateDialog

**File:** `src/components/miscellaneous/AddEditTemplateDialog.tsx`

Changes:
1. Add state variables: `addresseeName`, `address`, `contactNumber`, `salutation`
2. Set default footer text in reset: `"This letter is computer generated and does not require signature"`
3. Set default addressee name: `{fullName}`
4. Add new placeholders to EMPLOYEE_PLACEHOLDERS: `{address}`, `{phone}` 
5. Add Addressee Name input field
6. Add Address textarea field (multiline)
7. Add Contact Number input field
8. Add Salutation input field

Field placement in form:
```
┌─────────────────────────────────────────────┐
│ Template Name              │    Type        │
├─────────────────────────────────────────────┤
│ Available Placeholders                      │
│ {fullName}, {address}, {phone}, etc.        │
├─────────────────────────────────────────────┤
│ Addressee Name (Optional)                   │
│ Default: {fullName}                         │
├─────────────────────────────────────────────┤
│ Address (Optional - multiline)              │
│ ┌─────────────────────────────────────────┐ │
│ │ Default: extracted from employee        │ │
│ │ {address} placeholder available         │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Contact Number (Optional)                   │
│ Default: extracted from employee {phone}    │
├─────────────────────────────────────────────┤
│ Salutation (default: To Whom It May Concern)│
├─────────────────────────────────────────────┤
│ Letter Title *                              │
├─────────────────────────────────────────────┤
│ Body Paragraph 1 *                          │
│ Body Paragraph 2                            │
│ Signature Image                             │
│ Signatory Name    │ Position                │
│ Company Name                                │
│ Footer Text (default: "This letter is...")  │
└─────────────────────────────────────────────┘
```

### 4. Update PDF Generator

**File:** `src/utils/verificationLetterPDFGenerator.ts`

#### 4.1 Update interfaces:

```typescript
export interface EmployeeData {
  name: string;
  dateOfBirth: string;
  nric: string;
  position: string;
  baseSalary: number;
  joinDate: string;
  address?: string;    // NEW
  phone?: string;      // NEW
}

export interface LetterTemplateData {
  // ... existing fields
  addressee_name?: string;   // NEW
  address?: string;          // NEW
  contact_number?: string;   // NEW
  salutation?: string;       // NEW
  company_name?: string;
  footer_text?: string;
}
```

#### 4.2 Update placeholder replacement:

```typescript
// EmployeePlaceholders interface
interface EmployeePlaceholders {
  fullName: string;
  dateOfBirth: string;
  nric: string;
  position: string;
  salary: string;
  joinDate: string;
  address: string;    // NEW
  phone: string;      // NEW
}

// Update replaceEmployeePlaceholders
const replaceEmployeePlaceholders = (template: string, data: EmployeePlaceholders): string => {
  return template
    .replace(/{fullName}/g, data.fullName)
    .replace(/{dateOfBirth}/g, data.dateOfBirth)
    .replace(/{nric}/g, data.nric)
    .replace(/{position}/g, data.position)
    .replace(/{salary}/g, data.salary)
    .replace(/{joinDate}/g, data.joinDate)
    .replace(/{address}/g, data.address)    // NEW
    .replace(/{phone}/g, data.phone);       // NEW
};
```

#### 4.3 Add dynamic content fitting logic:

```typescript
const calculateContentHeight = (
  doc: jsPDF,
  sections: { type: string; content: string }[]
): number => {
  let height = 0;
  sections.forEach(section => {
    if (section.content) {
      const lines = doc.splitTextToSize(section.content, 170);
      height += lines.length * 6 + 8; // line height + spacing
    }
  });
  return height;
};
```

#### 4.4 Update PDF rendering order:

New rendering sequence for employee letters:
1. Date (left-aligned)
2. **Addressee Name** (if provided, e.g., "John Doe")
3. **Address** (if provided, multiline support - defaults to employee address)
4. **Contact Number** (if provided, defaults to employee phone)
5. Blank line
6. **Salutation** (use template value or "To Whom It May Concern")
7. Title (centered, bold)
8. Body Paragraph 1
9. Body Paragraph 2 (if provided)
10. Signature block (image, name, position, company)
11. **Footer** (use template `footer_text` or default message)

#### 4.5 Dynamic spacing implementation:

```typescript
// Calculate total content height
const contentHeight = calculateContentHeight(doc, contentSections);
const pageHeight = doc.internal.pageSize.getHeight();
const availableSpace = pageHeight - 55 - 30; // header - footer margin

// Adjust line spacing if content fits comfortably
const lineSpacing = contentHeight < availableSpace * 0.7 ? 7 : 6;
```

---

## Files to Modify

| File | Action |
|------|--------|
| Database migration | CREATE (add new columns) |
| `src/services/letterTemplateService.ts` | MODIFY (update interfaces and defaults) |
| `src/components/miscellaneous/AddEditTemplateDialog.tsx` | MODIFY (add fields, update defaults) |
| `src/utils/verificationLetterPDFGenerator.ts` | MODIFY (add fields, placeholders, dynamic fitting) |

---

## Implementation Order

1. Run database migration to add columns
2. Update `letterTemplateService.ts` with new fields
3. Update `AddEditTemplateDialog.tsx` with new fields and defaults
4. Update `verificationLetterPDFGenerator.ts` for new fields and dynamic fitting
5. Test PDF generation with various content lengths

---

## Default Values Summary

| Field | Default Value |
|-------|---------------|
| Addressee Name | `{fullName}` |
| Address | `{address}` (extracted from employee details) |
| Contact Number | `{phone}` (extracted from employee details) |
| Salutation | `To Whom It May Concern` |
| Footer Text | `This letter is computer generated and does not require signature` |

