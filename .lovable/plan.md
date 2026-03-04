

## Plan: Auto-fill category when selecting a product

### Root Cause
When a product is selected via the product search, `handleProductChange` updates the product ID and price but never sets `newItem.category_id`. Since `selectedCategory` is derived from `newItem.category_id`, all category-dependent logic (term/slot for Classes, size for Uniforms) remains inactive.

### Fix

**`src/components/sales/CreateInvoiceDialog.tsx`** — In `handleProductChange`, after finding the product, set the `category_id` from the product's `category_id`. Then re-derive `isClassesCategory` from the product's actual category rather than from `selectedCategory` (which hasn't updated yet):

```typescript
const handleProductChange = async (productId: string) => {
  const product = products.find(p => p.id === productId);
  
  // Auto-fill category from product
  const productCategory = product ? categories.find(c => c.id === product.category_id) : null;
  const isClassesCategory = productCategory?.name === 'Classes';
  
  // ... rest of existing logic (term refresh, branch pricing) stays the same ...

  setNewItem(prev => ({
    ...prev,
    product_id: productId,
    category_id: product?.category_id || prev.category_id,  // <-- auto-fill
    unit_price: unitPrice,
    size_variant: '',
    color_variant: '',
    term_id: selectedTermId
  }));
};
```

This single change ensures:
- **Terms/slots** appear when a Classes product is selected (category auto-set triggers term loading)
- **Size variants** appear when a Uniform product is selected (category ID matches `UNIFORMS_CATEGORY_ID`)
- The category dropdown visually updates to reflect the product's category

