

# Use Country Letterhead in Invoice PDF Generation

## Overview
This change updates the invoice PDF generator to use the template's letterhead image (which includes the logo, company name, country, and UEN in a pre-designed layout) instead of manually constructing the header from separate elements.

---

## Current State

### How it works now:
1. The PDF generator loads `template.logo_url` and draws just the logo image
2. Then it manually writes company text: name, country, UEN using `doc.text()`
3. The `letterhead_url` is defined in the interface but **never used**

### Template data in database:
| Country | letterhead_url |
|---------|----------------|
| SG | `letterhead-1770010314926.png` |
| AU | `letterhead-1770010766036.png` |

---

## Proposed Change

### Use letterhead image as header:
- If `template.letterhead_url` exists: Load and display it as the header (replacing logo + text)
- If no letterhead: Fall back to current behavior (logo + manual text)

### Benefits:
- Consistent branding with pre-designed layout
- Country-specific letterheads automatically applied
- No need to hardcode company info text

---

## Implementation Details

### File: `src/utils/invoicePDFGenerator.ts`

#### 1. Add letterhead loading function:
```typescript
const loadLetterhead = (letterheadUrl?: string): Promise<string | null> => {
  if (!letterheadUrl) return Promise.resolve(null);
  return loadImage(letterheadUrl);
};
```

#### 2. Update header rendering logic:

**Before:**
```typescript
// Load and add company logo
const logoData = await loadCompanyLogo(invoice.template?.logo_url);
if (logoData) {
  doc.addImage(logoData, 'PNG', margin, yPos, 30, 30);
}

// Company header (manual text)
doc.setFontSize(16);
doc.text(COMPANY_INFO.name, margin + 35, yPos + 8);
doc.setFontSize(9);
doc.text(COMPANY_INFO.address, margin + 35, yPos + 15);
doc.text(`UEN: ${COMPANY_INFO.uen}`, margin + 35, yPos + 21);
```

**After:**
```typescript
// Try to load letterhead first (includes logo + company info)
const letterheadData = await loadImage(invoice.template?.letterhead_url || '');

if (letterheadData) {
  // Use full letterhead image - spans left side of header
  // Letterhead dimensions: approximately 100mm wide x 25mm tall
  doc.addImage(letterheadData, 'PNG', margin, yPos, 80, 20);
} else {
  // Fallback: Load logo and draw text manually
  const logoData = await loadCompanyLogo(invoice.template?.logo_url);
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, yPos, 30, 30);
  }
  
  // Company header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, logoData ? margin + 35 : margin, yPos + 8);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, logoData ? margin + 35 : margin, yPos + 15);
  doc.text(`UEN: ${COMPANY_INFO.uen}`, logoData ? margin + 35 : margin, yPos + 21);
}
```

---

## Layout Comparison

### Current PDF Header:
```text
+------------------------------------------+
|  [Logo]  GAONHAE TAEKWONDO LLP   INVOICE |
|          Singapore                       |
|          UEN: T24LL0001A                 |
+------------------------------------------+
```

### New PDF Header (with letterhead):
```text
+------------------------------------------+
|  [====== Letterhead Image ======] INVOICE |
|  (Contains logo + company info)          |
+------------------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/invoicePDFGenerator.ts` | Update header section to prioritize letterhead image over manual text rendering |

---

## Technical Notes

1. **Image Sizing**: The letterhead will be rendered at approximately 80mm x 20mm to fit well in the header area while leaving space for the "INVOICE" title on the right

2. **Fallback Behavior**: If letterhead is not available, the current logo + text approach will be used as fallback

3. **Cross-Origin**: The existing `loadImage()` function already handles CORS for Supabase storage URLs

4. **yPos Adjustment**: May need slight adjustment to `yPos` increment after letterhead vs after logo+text to maintain consistent spacing

