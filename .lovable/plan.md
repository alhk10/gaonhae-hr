
# Plan: Remove Belt Rank Variant Tab

## Overview
Remove the "Belt Rank" variant tab from the Product Variant Manager while keeping the Size and Color variant tabs fully functional. The database columns will remain untouched to preserve existing data.

**Important Note**: This removes only the **Belt Rank Variant** (product variant options). The **Belt Level Requirements** section (eligibility to purchase a product based on student's belt level) will remain functional as it's a separate feature.

---

## Scope of Removal

### UI Elements to Remove
1. **Belt Rank tab** in ProductVariantManager dialog
2. **Belt Rank badge** display in Add/Edit Product dialogs
3. **Belt Ranks section** in Product Detail dialog

### What Remains Functional
- Size variant tab and all its functionality
- Color variant tab and all its functionality
- Belt Level Requirements section (min/max belt level for eligibility)
- All other product features (pricing, categories, inventory, etc.)

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/sales/ProductVariantManager.tsx` | Edit | Remove belt_rank tab, icon, color, state, and logic |
| `src/components/sales/AddProductDialog.tsx` | Edit | Remove belt_rank from state, badges, and submit logic |
| `src/components/sales/EditProductDialog.tsx` | Edit | Remove belt_rank from state, badges, and submit logic |
| `src/components/sales/ProductDetailDialog.tsx` | Edit | Remove Belt Ranks display section |
| `src/services/variantTypesService.ts` | Edit | Remove belt_ranks from type and utility functions |
| `src/services/productService.ts` | Edit | Remove belt_ranks from ProductVariants interface and parseVariants |

---

## Implementation Details

### Step 1: Update `ProductVariantManager.tsx`

**Remove from props interface (lines 23-27):**
```typescript
// Change from:
enabledTypes: {
  size: boolean;
  color: boolean;
  belt_rank: boolean;
};
onEnabledTypesChange: (enabledTypes: { size: boolean; color: boolean; belt_rank: boolean }) => void;

// To:
enabledTypes: {
  size: boolean;
  color: boolean;
};
onEnabledTypesChange: (enabledTypes: { size: boolean; color: boolean }) => void;
```

**Remove from VARIANT_ICONS (line 35):**
- Delete: `belt_rank: <Award className="w-4 h-4" />`

**Remove from VARIANT_COLORS (line 41):**
- Delete: `belt_rank: 'bg-amber-500/10 text-amber-700 border-amber-200'`

**Remove from newValues state (line 59):**
- Delete: `belt_rank: ''`

**Remove from getVariantArray switch (line 89):**
- Delete: `case 'belt_rank': return currentVariants.belt_ranks || [];`

**Remove from setVariantArray switch (line 99):**
- Delete: `case 'belt_rank': return { ...prev, belt_ranks: values };`

**Remove from totalValues calculation (line 281):**
- Delete: `(currentVariants.belt_ranks?.length || 0)`

**Remove Belt Rank tab trigger (lines 322-330):**
- Delete the entire `<TabsTrigger value="belt_rank">` block

**Remove Belt Rank tab content (lines 340-342):**
- Delete: `<TabsContent value="belt_rank" className="mt-0">{renderVariantTab('belt_rank')}</TabsContent>`

**Update TabsList grid (line 303):**
- Change from: `grid-cols-3`
- To: `grid-cols-2`

**Remove from Variant Summary (lines 358-360):**
- Delete belt_rank summary display

**Remove Award icon import (line 16):**
- Remove `Award` from lucide-react imports

### Step 2: Update `AddProductDialog.tsx`

**Remove from enabledVariantTypes state (lines 54-58):**
```typescript
// Change from:
const [enabledVariantTypes, setEnabledVariantTypes] = useState({
  size: false,
  color: false,
  belt_rank: false
});

// To:
const [enabledVariantTypes, setEnabledVariantTypes] = useState({
  size: false,
  color: false
});
```

**Remove from available_variants initial state (line 46):**
- Remove `belt_ranks: []` from the object

**Remove from productData submit (line 100):**
- Delete: `requires_belt_rank: enabledVariantTypes.belt_rank,`

**Remove from resetForm (line 129):**
- Remove `belt_ranks: []` and from enabledVariantTypes reset

**Remove Belt Rank badge display (lines 278-282):**
- Delete the entire conditional block for belt_rank badge

**Update hasAnyVariants check (line 149):**
- Remove `|| enabledVariantTypes.belt_rank`

### Step 3: Update `EditProductDialog.tsx`

**Remove from enabledVariantTypes state (lines 56-60):**
```typescript
// Change from:
const [enabledVariantTypes, setEnabledVariantTypes] = useState({
  size: false,
  color: false,
  belt_rank: false
});

// To:
const [enabledVariantTypes, setEnabledVariantTypes] = useState({
  size: false,
  color: false
});
```

**Remove from available_variants initial state (line 48):**
- Remove `belt_ranks: []` from the object

**Remove from useEffect form population (line 84):**
- Delete: `belt_rank: product.requires_belt_rank || (variants.belt_ranks?.length || 0) > 0`

**Remove from handleSubmit (line 126):**
- Delete: `requires_belt_rank: enabledVariantTypes.belt_rank,`

**Remove Belt Rank badge display (lines 280-284):**
- Delete the entire conditional block for belt_rank badge

**Update hasAnyVariants check (line 149):**
- Remove `|| enabledVariantTypes.belt_rank`

### Step 4: Update `ProductDetailDialog.tsx`

**Remove Belt Ranks variant section (lines 247-258):**
- Delete the entire conditional block that displays belt_ranks

### Step 5: Update `variantTypesService.ts`

**Remove from ProductVariants interface (line 26):**
- Delete: `belt_ranks?: string[];`

**Remove from flattenVariants function (lines 129-131):**
- Delete the belt_ranks push block

**Remove from calculateVariantCombinations function (line 142):**
- Delete: `const beltRanks = variants.belt_ranks?.length || 1;`
- Update return to: `return sizes * colors;`

### Step 6: Update `productService.ts`

**Remove from ProductVariants interface (line 13):**
- Delete: `belt_ranks?: string[];`

**Remove from parseVariants function (line 23):**
- Delete: `belt_ranks: Array.isArray(obj.belt_ranks) ? obj.belt_ranks : undefined`

---

## Database Columns (Preserved)
The following database columns will remain untouched for backward compatibility:
- `products.requires_belt_rank` (boolean)
- `products.available_variants` (jsonb - may contain `belt_ranks` key from existing data)
- `product_variant_types` table (Belt Rank record will remain)

---

## Summary of Changes

| File | Lines Removed | Change Type |
|------|---------------|-------------|
| `ProductVariantManager.tsx` | ~40 lines | Edit |
| `AddProductDialog.tsx` | ~12 lines | Edit |
| `EditProductDialog.tsx` | ~12 lines | Edit |
| `ProductDetailDialog.tsx` | ~12 lines | Edit |
| `variantTypesService.ts` | ~8 lines | Edit |
| `productService.ts` | ~3 lines | Edit |

---

## Testing Checklist

- [ ] Add Product dialog opens and Manage Variants shows only Size and Color tabs
- [ ] Edit Product dialog loads existing products and shows only Size and Color tabs
- [ ] Product Detail dialog displays only Size and Color variants (not Belt Ranks)
- [ ] Existing products with belt_rank data still load without errors (backward compatible)
- [ ] Size and Color variant functionality works completely
- [ ] Belt Level Requirements section (eligibility) still functions correctly
- [ ] No console errors related to removed functionality
