

# Change Country Letterhead URL to Long Text Field

## Overview
Change the "Country Letterhead URL" field from a single-line `Input` to a multi-line `Textarea` component for better visibility of long URLs.

---

## Current State
The field uses a standard `Input` component which only shows one line of text, making long URLs difficult to read and verify.

---

## Proposed Change

### File: `src/components/sales/InvoiceTemplateList.tsx`

Change from:
```tsx
<Input
  id="letterhead_url"
  value={formData.letterhead_url}
  onChange={(e) => setFormData(prev => ({ ...prev, letterhead_url: e.target.value }))}
  placeholder="https://example.com/letterhead.png"
/>
```

To:
```tsx
<Textarea
  id="letterhead_url"
  value={formData.letterhead_url}
  onChange={(e) => setFormData(prev => ({ ...prev, letterhead_url: e.target.value }))}
  placeholder="https://example.com/letterhead.png"
  rows={2}
/>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/sales/InvoiceTemplateList.tsx` | Replace `Input` with `Textarea` for the letterhead_url field (line ~363) |

---

## Notes
- The `Textarea` component is already imported in the file
- Using `rows={2}` provides enough space to display long URLs while keeping the form compact

