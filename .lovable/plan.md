
# Plan: Remove Sessions & Validity Section

## Overview
Remove the "Sessions & Validity" section from the product management UI (Add Product, Edit Product, and Product Detail dialogs) along with its associated component (`TermValiditySelector`). The database columns will remain untouched to preserve existing data, but the UI and form data handling for these fields will be removed.

## Scope of Removal

### UI Elements to Remove
1. **Sessions & Validity section** containing:
   - Session Count input field
   - Recurring (monthly fees) toggle switch
   - Validity Period selector (By Duration/By Academic Term)
   - Term selection dropdown with branch grouping

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/sales/AddProductDialog.tsx` | Edit | Remove section, import, and form state fields |
| `src/components/sales/EditProductDialog.tsx` | Edit | Remove section, import, and form state fields |
| `src/components/sales/ProductDetailDialog.tsx` | Edit | Remove Sessions & Validity card |
| `src/components/sales/TermValiditySelector.tsx` | Delete | Remove entire component file |

## Implementation Details

### Step 1: Update `AddProductDialog.tsx`

**Remove import (line 19):**
```typescript
// DELETE: import { TermValiditySelector } from './TermValiditySelector';
```

**Remove unused icon import (line 17):**
- Remove `Calendar` from the lucide-react import (it's only used for Sessions & Validity)

**Remove from form state (lines 51-55):**
```typescript
// DELETE these fields from formData useState:
session_count: '',
validity_type: 'months' as 'months' | 'term',
validity_months: '',
term_id: null as string | null,
is_recurring: false,
```

**Remove from handleSubmit productData (lines 110-114):**
```typescript
// DELETE these mappings:
session_count: formData.session_count ? parseInt(formData.session_count) : undefined,
validity_type: formData.validity_type,
validity_months: formData.validity_type === 'months' && formData.validity_months ? parseInt(formData.validity_months) : undefined,
term_id: formData.validity_type === 'term' ? formData.term_id : undefined,
is_recurring: formData.is_recurring,
```

**Remove from resetForm (lines 144-148):**
```typescript
// DELETE these resets:
session_count: '',
validity_type: 'months',
validity_months: '',
term_id: null,
is_recurring: false,
```

**Remove entire Sessions & Validity section (lines 369-411):**
- Delete the entire `<section>` block containing Sessions & Validity UI

### Step 2: Update `EditProductDialog.tsx`

**Remove import (line 15):**
```typescript
// DELETE: import { TermValiditySelector } from './TermValiditySelector';
```

**Remove unused icon import (line 10):**
- Remove `Calendar` from the lucide-react import

**Remove from form state (lines 53-57):**
```typescript
// DELETE these fields from formData useState:
session_count: 0,
validity_type: 'months' as 'months' | 'term',
validity_months: 0,
term_id: null as string | null,
is_recurring: false,
```

**Remove from useEffect form population (lines 83-87):**
```typescript
// DELETE these assignments:
session_count: product.session_count || 0,
validity_type: (product.validity_type as 'months' | 'term') || 'months',
validity_months: product.validity_months || 0,
term_id: product.term_id || null,
is_recurring: product.is_recurring || false,
```

**Remove entire Sessions & Validity section (lines 345-374):**
- Delete the entire `<section>` block containing Sessions & Validity UI

### Step 3: Update `ProductDetailDialog.tsx`

**Remove unused icon import (line 6):**
- Remove `Clock` from the lucide-react import (it's only used for Sessions & Validity card)

**Remove Sessions & Validity card (lines 211-243):**
- Delete the entire conditional card block that displays sessions and validity information

### Step 4: Delete `TermValiditySelector.tsx`

- Remove the entire file `src/components/sales/TermValiditySelector.tsx`

## What Remains Functional

- All other product fields (name, SKU, description, category, pricing, variants, belt requirements, status)
- Branch pricing configuration
- Product listing and filtering
- Database columns remain intact for backward compatibility with existing data
- Student entitlements that reference these fields will continue to work with existing data
- Class enrollment system continues to function independently

## Files Summary

| File | Lines Affected | Change Type |
|------|----------------|-------------|
| `AddProductDialog.tsx` | ~60 lines removed | Edit |
| `EditProductDialog.tsx` | ~50 lines removed | Edit |
| `ProductDetailDialog.tsx` | ~35 lines removed | Edit |
| `TermValiditySelector.tsx` | 185 lines | Delete |

## Testing Considerations

After implementation, verify:
1. Add Product dialog opens and submits without errors
2. Edit Product dialog loads existing products and saves updates
3. Product Detail dialog displays all remaining information correctly
4. No console errors related to removed functionality
5. Existing products with session/validity data still display in product list
