
# Plan: Change Belt Level Requirements to Multi-Select

## Overview
Replace the current min/max belt level range approach with a multi-select dropdown. Products will have a list of allowed belt levels, and only students with matching belts can see those products.

---

## Current Approach
- **min_belt_level** + **max_belt_level**: Products define a range (e.g., Green Tip to Blue)
- **Filtering**: Check if student's belt index falls between min and max indices

## New Approach
- **allowed_belt_levels**: Array of specific belt levels (e.g., `['Green Tip', 'Green', 'Blue Tip']`)
- **Filtering**: Check if student's normalized belt exists in the allowed array

---

## Database Schema Change

### New Column
Add `allowed_belt_levels` (TEXT ARRAY) to the `products` table.

```sql
ALTER TABLE products 
ADD COLUMN allowed_belt_levels TEXT[];
```

The existing `min_belt_level` and `max_belt_level` columns will be deprecated but not removed immediately (for backward compatibility during transition).

---

## Files to Modify

### 1. Database Migration
Create a new migration to add `allowed_belt_levels` column.

### 2. Supabase Types (`src/integrations/supabase/types.ts`)
Update to include the new `allowed_belt_levels` field in the products table type.

### 3. Product Service (`src/services/productService.ts`)

**Changes:**
- Add `allowed_belt_levels?: string[]` to the `Product` interface
- Update `transformProduct` to include `allowed_belt_levels`
- Update `createProduct` to save `allowed_belt_levels`
- Update `updateProduct` to save `allowed_belt_levels`

```typescript
// Interface addition
allowed_belt_levels?: string[];

// Transform addition
allowed_belt_levels: raw.allowed_belt_levels,
```

### 4. Add Product Dialog (`src/components/sales/AddProductDialog.tsx`)

**Changes:**
- Import `MultiSelect` component
- Replace `min_belt_level` and `max_belt_level` in form state with `allowed_belt_levels: []`
- Replace the two Select dropdowns with a single MultiSelect
- Update `handleSubmit` to send `allowed_belt_levels` instead of min/max

**Before:**
```tsx
<div className="grid grid-cols-2 gap-3">
  <Select value={min_belt_level}>...</Select>
  <Select value={max_belt_level}>...</Select>
</div>
```

**After:**
```tsx
<div className="space-y-1">
  <Label>Allowed Belt Levels</Label>
  <MultiSelect
    values={formData.allowed_belt_levels}
    onValuesChange={(values) => handleInputChange('allowed_belt_levels', values)}
    options={BELT_LEVELS}
    placeholder="Select belt levels..."
    searchPlaceholder="Search belt levels..."
    maxDisplayed={3}
  />
</div>
```

### 5. Edit Product Dialog (`src/components/sales/EditProductDialog.tsx`)

**Changes:**
- Import `MultiSelect` component
- Replace `min_belt_level` and `max_belt_level` in form state with `allowed_belt_levels: []`
- Load existing `allowed_belt_levels` from product data
- Replace the two Select dropdowns with a single MultiSelect
- Update submit to send `allowed_belt_levels`

### 6. Create Invoice Dialog (`src/components/sales/CreateInvoiceDialog.tsx`)

**Changes:**
- Update `ProductWithVariants` interface to include `allowed_belt_levels?: string[]`
- Update `loadProducts` to fetch `allowed_belt_levels`
- Simplify `isProductAvailableForBelt` function:

**Before (range-based):**
```typescript
const isProductAvailableForBelt = (product, studentBelt) => {
  if (!product.requires_belt_level) return true;
  const studentIndex = getBeltIndex(studentBelt);
  const minIndex = getBeltIndex(product.min_belt_level);
  const maxIndex = getBeltIndex(product.max_belt_level);
  return studentIndex >= minIndex && studentIndex <= maxIndex;
};
```

**After (array-based):**
```typescript
const isProductAvailableForBelt = (product, studentBelt) => {
  if (!product.requires_belt_level) return true;
  if (!product.allowed_belt_levels || product.allowed_belt_levels.length === 0) return true;
  
  const normalizedStudentBelt = normalizeBelt(studentBelt);
  return product.allowed_belt_levels.includes(normalizedStudentBelt);
};
```

---

## Summary of Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/xxx_add_allowed_belt_levels.sql` |
| Modify | `src/integrations/supabase/types.ts` |
| Modify | `src/services/productService.ts` |
| Modify | `src/components/sales/AddProductDialog.tsx` |
| Modify | `src/components/sales/EditProductDialog.tsx` |
| Modify | `src/components/sales/CreateInvoiceDialog.tsx` |

---

## UI Preview

**Belt Level Requirements Section (After Change):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🏆 Belt Level Requirements                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Toggle] Requires specific belt level                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Allowed Belt Levels                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Green Tip ×] [Green ×] [+2 more ▼]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Execution Order

1. Create database migration for `allowed_belt_levels` column
2. Update Supabase types
3. Update productService with new field
4. Update AddProductDialog to use MultiSelect
5. Update EditProductDialog to use MultiSelect
6. Update CreateInvoiceDialog filtering logic
